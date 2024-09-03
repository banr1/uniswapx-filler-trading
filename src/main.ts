// main.ts

import { OrderType } from '@uniswap/uniswapx-sdk';
import { fetchIntents } from './lib/fetch-intents';
import { FetchOrdersParams } from './types/fetch-orders-params';
import { callExecute } from './lib/call-execute';
import { logger } from './lib/logger';

const monitorIntents = async () => {
  const chainId = 42161;
  const params: FetchOrdersParams = {
    chainId,
    limit: 10,
    orderStatus: 'open',
    sortKey: 'createdAt',
    desc: true,
    sort: 'lt(9000000000)',
    orderType: OrderType.Dutch_V2,
    includeV2: true,
  };

  try {
    const intents = await fetchIntents(params);
    if (intents.length > 0) {
      const intent = intents[0];
      if (intent === undefined) return;
      await callExecute(intent, chainId);
    } else {
      logger.info('No intents found');
    }
  } catch (error) {
    logger.error('An error occurred in the monitorIntents function:', error);
  }
};

const main = async () => {
  // Call fetchIntents immediately
  await monitorIntents();

  // Set up an interval to call fetchIntents every 5 second
  setInterval(monitorIntents, 250);
};

// Run the main function
main().catch(error => {
  logger.error('An error occurred in the main function:', error);
});
