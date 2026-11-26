import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { adminUrl } from '../config.js';

const issuer = 'https://oauth.telegram.org';
const telegramKeys = createRemoteJWKSet(new URL('/.well-known/jwks.json', issuer));

/** Uses the Bot API user ID in the signed profile, distinct from the OIDC subject. */
export async function verifiedTelegramId(
  token: string,
  audience: string,
  keys: JWTVerifyGetKey
): Promise<string> {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, keys, {
      issuer,
      audience,
      algorithms: ['RS256'],
      requiredClaims: ['sub', 'iat', 'exp'],
      maxTokenAge: '5 minutes',
      clockTolerance: 5,
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout)) {
      throw new UnauthorizedException('Invalid Telegram identity');
    }
    throw new BadGatewayException('Telegram verification unavailable');
  }
  if (typeof payload.id !== 'number' || !Number.isSafeInteger(payload.id) || payload.id < 1) {
    throw new UnauthorizedException('Missing Telegram user ID');
  }
  return String(payload.id);
}

@Injectable()
export class TelegramIdentity {
  private settings() {
    const clientId = process.env.TELEGRAM_CLIENT_ID?.trim();
    const secret = process.env.TELEGRAM_CLIENT_SECRET?.trim();
    if (!clientId || !secret)
      throw new ServiceUnavailableException('Telegram Login is not configured');
    return { clientId, secret };
  }

  authorizationUrl(state: string, challenge: string): string {
    const { clientId } = this.settings();
    const url = new URL('/auth', issuer);
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: adminUrl().href,
      response_type: 'code',
      scope: 'openid profile',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.href;
  }

  async exchange(code: string, verifier: string): Promise<string> {
    const { clientId, secret } = this.settings();
    const response = await fetch(new URL('/token', issuer), {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: adminUrl().href,
        client_id: clientId,
        code_verifier: verifier,
      }),
    }).catch(() => {
      throw new BadGatewayException('Telegram unavailable');
    });
    if (response.status === 400)
      throw new UnauthorizedException('Telegram login expired or invalid');
    if (!response.ok) throw new BadGatewayException('Telegram unavailable');
    const body: unknown = await response.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('id_token' in body) ||
      typeof body.id_token !== 'string'
    ) {
      throw new BadGatewayException('Invalid Telegram token response');
    }
    return verifiedTelegramId(body.id_token, clientId, telegramKeys);
  }
}
