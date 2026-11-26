import { openPool } from './database.js';
import { migrate } from './migrations.js';

const pool = openPool();
try {
  await migrate(pool);
  console.log('Database migrations applied.');
} finally {
  await pool.end();
}
