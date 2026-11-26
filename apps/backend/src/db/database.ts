import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { requireSetting } from '../config.js';

/** Opens a pool shared by one process. */
export function openPool(): pg.Pool {
  const pool = new pg.Pool({
    connectionString: requireSetting('DATABASE_URL'),
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', () => Logger.error('Idle PostgreSQL connection failed', 'Database'));
  return pool;
}

@Injectable()
export class Database implements OnApplicationShutdown {
  readonly pool = openPool();

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
