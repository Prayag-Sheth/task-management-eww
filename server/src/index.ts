import { createServer } from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { initSockets } from './sockets';
import { env } from './config/env';

async function start(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);

  initSockets(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
