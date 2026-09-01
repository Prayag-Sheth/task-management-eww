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

/**
 * Rejects the value shipped in .env.example. A placeholder secret is public
 * knowledge, so anyone could mint a valid admin token against it.
 */
function requiredSecret(name: string): string {
  const value = required(name);
  if (value.startsWith('CHANGE_ME') || value === 'replace_me_with_a_long_random_string') {
    throw new Error(
      `${name} is still the example placeholder. Generate one with:\n` +
        `  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters.`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGODB_URI'),
  jwtSecret: requiredSecret('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',

  /** CLIENT_URL accepts a comma-separated list of allowed origins. */
  corsOrigins: (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

export const isDev = env.nodeEnv !== 'production';
