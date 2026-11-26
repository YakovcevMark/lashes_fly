import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setTimeout } from 'node:timers/promises';
import { cleanExpiredCredentials } from './db/cleanup.js';
import { Database } from './db/database.js';

@Module({ providers: [Database] })
class WorkerModule {}

const app = await NestFactory.createApplicationContext(WorkerModule);
const stop = new AbortController();
process.once('SIGINT', () => stop.abort());
process.once('SIGTERM', () => stop.abort());
const db = app.get(Database);
try {
  while (!stop.signal.aborted) {
    try {
      await cleanExpiredCredentials(db.pool);
    } catch {
      Logger.error('Credential cleanup failed. It will be retried in one minute.', 'Worker');
    }
    await setTimeout(60000, undefined, { signal: stop.signal }).catch(() => undefined);
  }
} finally {
  await app.close();
}
