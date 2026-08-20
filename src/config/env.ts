import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function readString(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative integer`);
  }

  return parsed;
}

const poolMin = readInt('DB_POOL_MIN', 2);
const poolMax = Math.max(poolMin, readInt('DB_POOL_MAX', 10));

export const env = {
  nodeEnv: readString('NODE_ENV', 'development'),
  port: readInt('PORT', 3000),
  db: {
    host: readString('DB_HOST', 'localhost'),
    port: readInt('DB_PORT', 5432),
    user: readString('DB_USER'),
    password: readString('DB_PASSWORD', ''),
    name: readString('DB_NAME'),
    pool: {
      min: poolMin,
      max: poolMax,
    },
  },
  jwt: {
    secret: readString('JWT_SECRET'),
    expiresIn: readString('JWT_EXPIRES_IN', '1d'),
  },
  uploadPath: readString('UPLOAD_PATH', './uploads'),
} as const;

export const uploadDir = path.resolve(process.cwd(), env.uploadPath);
