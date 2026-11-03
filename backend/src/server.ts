import app from './app';
import { env } from './utils/env';
import { prisma } from './utils/prisma';

const server = app.listen(env.port, () => {
  console.log(`Nimbus API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
