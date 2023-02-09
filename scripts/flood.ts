import { createFloodNode, logger } from '../test/utils/node';

const main = async (): Promise<void> => {
  await createFloodNode();
};

export default main().catch((error) => {
  logger.error('🚨 Internal application error', error);
  process.exit(1);
});
