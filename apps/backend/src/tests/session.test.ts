import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import pg from 'pg';
import type { IssuedSession, TelegramLoginStart } from '@lashes/api-contract';
import { AppModule } from '../app.module.js';
import { cleanExpiredCredentials } from '../db/cleanup.js';
import { Database } from '../db/database.js';
import { migrate } from '../db/migrations.js';
import { TelegramIdentity, verifiedTelegramId } from '../telegram/identity.js';

const testMasterId = '100001';
const testAudience = '123456';
const schema = 'test_' + randomUUID().replaceAll('-', '');
let schemaCreated = false;
let bootstrap: pg.Pool;
let app: INestApplication;
let endpoint: string;
let db: Database;
const codes = new Map<string, { id: number; challenge: string }>();

before(async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  assert.ok(databaseUrl, 'Set TEST_DATABASE_URL to run PostgreSQL acceptance tests.');
  bootstrap = new pg.Pool({ connectionString: databaseUrl });
  await bootstrap.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  const scoped = new URL(databaseUrl);
  scoped.searchParams.set('options', '-csearch_path=' + schema);
  process.env.DATABASE_URL = scoped.href;
  process.env.MASTER_TELEGRAM_ID = testMasterId;
  process.env.TELEGRAM_CLIENT_ID = testAudience;
  process.env.TELEGRAM_CLIENT_SECRET = 'test-only';
  process.env.ADMIN_URL = 'http://localhost:5173/';
  process.env.SESSION_TTL_DAYS = '7';
  app = await NestFactory.create(AppModule, { logger: false });
  db = app.get(Database);
  await Promise.all([migrate(db.pool), migrate(db.pool)]);
  app.setGlobalPrefix('api/v1');
  await app.listen(0, '127.0.0.1');
  endpoint = (await app.getUrl()) + '/api/v1/session';

  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const keys = createLocalJWKSet({ keys: [await exportJWK(publicKey)] });
  // Only the external code exchange is replaced; real signed claims and the HTTP guard are exercised.
  app.get(TelegramIdentity).exchange = async (code, verifier) => {
    const grant = codes.get(code);
    assert.ok(grant);
    assert.equal(createHash('sha256').update(verifier).digest('base64url'), grant.challenge);
    const jwt = await new SignJWT({ id: grant.id })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('oidc-subject')
      .setIssuer('https://oauth.telegram.org')
      .setAudience(testAudience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
    return verifiedTelegramId(jwt, testAudience, keys);
  };
});

after(async () => {
  await app?.close();
  if (schemaCreated) await bootstrap.query(`DROP SCHEMA "${schema}" CASCADE`);
  await bootstrap?.end();
});

/** Starts a real login attempt and prepares a provider response bound to its PKCE challenge. */
async function begin(id = Number(testMasterId)) {
  const start = await fetch(endpoint + '/telegram/start', { method: 'POST' });
  assert.equal(start.status, 200);
  const { authorizationUrl, browserKey } = (await start.json()) as TelegramLoginStart;
  const url = new URL(authorizationUrl);
  assert.equal(url.origin, 'https://oauth.telegram.org');
  assert.equal(url.searchParams.get('redirect_uri'), process.env.ADMIN_URL);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  const code = randomUUID();
  codes.set(code, { id, challenge: url.searchParams.get('code_challenge')! });
  return { code, state: url.searchParams.get('state')!, browserKey };
}

/** Posts a callback through the same HTTP route as the panel. */
function complete(input: unknown) {
  return fetch(endpoint + '/telegram/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** Reads or revokes a credential using the public session contract. */
function session(token: string, method = 'GET') {
  return fetch(endpoint, { method, headers: { Authorization: 'Bearer ' + token } });
}

test('migrations are repeatable and anonymous requests return 401', async () => {
  assert.equal((await db.pool.query('SELECT name FROM schema_migrations')).rowCount, 1);
  assert.equal((await fetch(endpoint)).status, 401);
});

test('master receives a seven-day session, then logout revokes it', async () => {
  const callback = await begin();
  const responses = await Promise.all([complete(callback), complete(callback)]);
  assert.deepEqual(responses.map((res) => res.status).sort(), [200, 401]);
  const result = (await responses.find((res) => res.ok)!.json()) as IssuedSession;
  const expiresIn = Date.parse(result.session.expiresAt) - Date.now();
  assert.ok(Math.abs(expiresIn - 7 * 86400000) < 10000);
  assert.equal(result.session.telegramId, testMasterId);
  assert.equal((await session(result.accessToken)).status, 200);
  assert.equal((await session(result.accessToken, 'DELETE')).status, 204);
  assert.equal((await session(result.accessToken)).status, 401);
});

test('different Telegram account is denied by the server', async () => {
  assert.equal((await complete(await begin(100002))).status, 403);
});

test('wrong browser binding and expired attempts are rejected', async () => {
  const input = await begin();
  assert.equal((await complete({ ...input, browserKey: 'x'.repeat(43) })).status, 401);
  await db.pool.query(
    "UPDATE telegram_login_attempts SET expires_at = now() - interval '1 minute'"
  );
  assert.equal((await complete(input)).status, 401);
  assert.equal((await complete({ id: testMasterId })).status, 400);
});

test('expired sessions are denied before the worker removes them', async () => {
  const result = (await (await complete(await begin())).json()) as IssuedSession;
  await db.pool.query("UPDATE master_sessions SET expires_at = now() - interval '1 minute'");
  assert.equal((await session(result.accessToken)).status, 401);
  await cleanExpiredCredentials(db.pool);
  assert.equal((await db.pool.query('SELECT 1 FROM master_sessions')).rowCount, 0);
  assert.equal((await db.pool.query('SELECT 1 FROM telegram_login_attempts')).rowCount, 0);
});

test('signature, issuer, audience, signed profile and token age are required', async () => {
  const keys = await generateKeyPair('RS256');
  const other = await generateKeyPair('RS256');
  const resolver = createLocalJWKSet({ keys: [await exportJWK(keys.publicKey)] });
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: 'https://oauth.telegram.org',
    aud: testAudience,
    sub: 'oidc-subject',
    id: Number(testMasterId),
    exp: now + 60,
    iat: now,
  };
  for (const overrides of [
    { iss: 'https://example.invalid' },
    { aud: 'other' },
    { exp: now - 60 },
    { iat: now - 600 },
    { id: undefined },
  ]) {
    const token = await new SignJWT({ ...claims, ...overrides })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(keys.privateKey);
    await assert.rejects(verifiedTelegramId(token, testAudience, resolver), { status: 401 });
  }
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256' })
    .sign(other.privateKey);
  await assert.rejects(verifiedTelegramId(token, testAudience, resolver), { status: 401 });
});
