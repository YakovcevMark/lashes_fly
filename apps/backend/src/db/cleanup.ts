import type pg from 'pg';

/** Removes expired credentials in PostgreSQL, independently of request-time expiry checks. */
export async function cleanExpiredCredentials(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM telegram_login_attempts WHERE expires_at <= now()');
  await pool.query('DELETE FROM master_sessions WHERE expires_at <= now()');
}
