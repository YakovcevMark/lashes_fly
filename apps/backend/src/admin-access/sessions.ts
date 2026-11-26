import { createHash, randomBytes } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { IssuedSession, MasterSession, TelegramLoginStart } from '@lashes/api-contract';
import { integerSetting } from '../config.js';
import { Database } from '../db/database.js';
import { TelegramIdentity } from '../telegram/identity.js';

/** Stores only a digest for lookup of bearer credentials. */
function digest(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

/** Generates a high-entropy URL-safe login credential. */
function randomKey(): string {
  return randomBytes(32).toString('base64url');
}

@Injectable()
export class Sessions {
  constructor(
    private readonly db: Database,
    private readonly telegram: TelegramIdentity
  ) {}

  private masterId(): string {
    const id = process.env.MASTER_TELEGRAM_ID?.trim();
    if (!id || !/^[1-9]\d{0,15}$/.test(id))
      throw new ServiceUnavailableException('Master ID is not configured');
    return id;
  }

  async begin(): Promise<TelegramLoginStart> {
    this.masterId();
    const state = randomKey();
    const browserKey = randomKey();
    const verifier = randomKey();
    const authorizationUrl = this.telegram.authorizationUrl(state, digest(verifier));
    await this.db.pool.query(
      `INSERT INTO telegram_login_attempts (state_hash, browser_key_hash, verifier, expires_at)
       VALUES ($1, $2, $3, now() + interval '5 minutes')`,
      [digest(state), digest(browserKey), verifier]
    );
    return { authorizationUrl, browserKey };
  }

  async complete(code: string, state: string, browserKey: string): Promise<IssuedSession> {
    // A callback is single-use and must originate from the browser that started this login.
    const attempt = await this.db.pool.query<{ verifier: string }>(
      `DELETE FROM telegram_login_attempts
       WHERE state_hash = $1 AND browser_key_hash = $2 AND expires_at > now() RETURNING verifier`,
      [digest(state), digest(browserKey)]
    );
    const row = attempt.rows[0];
    if (!row) throw new UnauthorizedException('Login expired or invalid');
    const telegramId = await this.telegram.exchange(code, row.verifier);
    if (telegramId !== this.masterId()) throw new ForbiddenException('Master access required');
    const accessToken = randomKey();
    const ttl = integerSetting('SESSION_TTL_DAYS', 7, 365);
    const result = await this.db.pool.query<{ expires_at: Date }>(
      `INSERT INTO master_sessions (token_hash, telegram_id, expires_at)
       VALUES ($1, $2, now() + $3 * interval '1 day') RETURNING expires_at`,
      [digest(accessToken), telegramId, ttl]
    );
    return {
      accessToken,
      session: { telegramId, expiresAt: result.rows[0]!.expires_at.toISOString() },
    };
  }

  async current(token: string): Promise<MasterSession> {
    const telegramId = this.masterId();
    const result = await this.db.pool.query<{ expires_at: Date }>(
      `SELECT expires_at FROM master_sessions WHERE token_hash = $1 AND telegram_id = $2 AND expires_at > now()`,
      [digest(token), telegramId]
    );
    const row = result.rows[0];
    if (!row) throw new UnauthorizedException();
    return { telegramId, expiresAt: row.expires_at.toISOString() };
  }

  async revoke(token: string): Promise<void> {
    await this.db.pool.query('DELETE FROM master_sessions WHERE token_hash = $1', [digest(token)]);
  }
}
