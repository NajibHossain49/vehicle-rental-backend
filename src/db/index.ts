import knex from 'knex';
import { env } from '../config/env';

const db = knex({
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
});

export default db;
