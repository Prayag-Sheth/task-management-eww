import { CorsOptions } from 'cors';
import { env, isDev } from './env';

/**
 * Returns true if the origin may call this API.
 *
 * In development any localhost port is accepted: Vite falls back to 5174, 5175
 * and so on when its default port is taken, which would otherwise break the app
 * with a confusing CORS error. Production allows only the configured origins.
 */
export function isAllowedOrigin(origin: string): boolean {
  if (env.corsOrigins.includes(origin)) return true;
  if (!isDev) return false;

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // A missing Origin means a same-origin or non-browser request (curl, tests).
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
};
