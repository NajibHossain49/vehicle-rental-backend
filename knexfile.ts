import dotenv from 'dotenv';
import type { Knex } from 'knex';

dotenv.config();

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
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;
