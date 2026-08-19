import dotenv from 'dotenv';
import type { Knex } from 'knex';

dotenv.config();

function envInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

const poolMin = envInt('DB_POOL_MIN', 2);
const poolMax = Math.max(poolMin, envInt('DB_POOL_MAX', 10));

const connection: Knex.PgConnectionConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const sharedConfig: Knex.Config = {
  client: 'pg',
  connection,
  pool: {
    min: poolMin,
    max: poolMax,
  },
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/db/seeds',
    extension: 'ts',
  },
};

const config: { [key: string]: Knex.Config } = {
  development: {
    ...sharedConfig,
  },
  test: {
    ...sharedConfig,
  },
  production: {
    ...sharedConfig,
  },
};

export default config;
