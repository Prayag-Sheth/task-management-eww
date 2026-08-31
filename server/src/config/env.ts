import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',

  /** CLIENT_URL accepts a comma-separated list of allowed origins. */
  corsOrigins: (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

export const isDev = env.nodeEnv !== 'production';
