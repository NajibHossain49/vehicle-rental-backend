import type { Knex } from 'knex';
import { env } from './src/config/env';

const sharedConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
  },
  pool: {
    min: env.db.pool.min,
    max: env.db.pool.max,
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
