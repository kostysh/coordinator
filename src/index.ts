import { CoordinatorOptions, Coordinator } from './server';
import { PORT } from './config';
import nodeKeyJson from '../peerKey.json';
import { Logger } from './utils/logger';

const logger = Logger('index');

process.once('unhandledRejection', (error) => {
  logger.error('🛸 Unhandled rejection', error);
  process.exit(1);
});

const main = async (): Promise<void> => {
  const options: CoordinatorOptions = {
    port: PORT,
    nodeKeyJson,
  };
  const server = new Coordinator(options);

  // Graceful Shutdown handler
  const shutdown = async () => {
    await server.stop();
    logger.info('👋 Server shutdown at:', new Date().toISOString());
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  await server.start();
};

export default main().catch((error) => {
  logger.error('🚨 Internal application error', error);
  process.exit(1);
});
