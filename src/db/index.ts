import dotenv from 'dotenv';
import knex from 'knex';

dotenv.config();

function envInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

const poolMin = envInt('DB_POOL_MIN', 2);
const poolMax = Math.max(poolMin, envInt('DB_POOL_MAX', 10));

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  pool: {
    min: poolMin,
    max: poolMax,
  },
});

export default db;
