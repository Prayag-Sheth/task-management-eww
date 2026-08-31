import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { corsOptions } from './config/cors';

export function createApp() {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json());

  app.use('/api', routes);

  // Order matters: unmatched routes first, then the error formatter last.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
