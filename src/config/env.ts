import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return trimmed;
}

function optional(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function optionalInt(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative integer`);
  }

  return parsed;
}

const poolMin = optionalInt('DB_POOL_MIN', process.env.DB_POOL_MIN, 2);
const poolMax = Math.max(poolMin, optionalInt('DB_POOL_MAX', process.env.DB_POOL_MAX, 10));

export const env = {
  nodeEnv: optional(process.env.NODE_ENV, 'development'),
  port: optionalInt('PORT', process.env.PORT, 3000),
  db: {
    host: optional(process.env.DB_HOST, 'localhost'),
    port: optionalInt('DB_PORT', process.env.DB_PORT, 5432),
    user: required('DB_USER', process.env.DB_USER),
    password: optional(process.env.DB_PASSWORD, ''),
    name: required('DB_NAME', process.env.DB_NAME),
    pool: {
      min: poolMin,
      max: poolMax,
    },
  },
  jwt: {
    secret: required('JWT_SECRET', process.env.JWT_SECRET),
    expiresIn: optional(process.env.JWT_EXPIRES_IN, '1d'),
  },
  uploadPath: optional(process.env.UPLOAD_PATH, './uploads'),
} as const;

export const uploadDir = path.resolve(process.cwd(), env.uploadPath);
