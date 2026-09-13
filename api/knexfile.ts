import type { Knex } from 'knex';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgresql://dc360:dc360_dev@localhost:5432/diabetescare360',
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
  test: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgresql://dc360:dc360_dev@localhost:5432/diabetescare360_test',
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
};

export default knexConfig;
module.exports = knexConfig;
