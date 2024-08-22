// main.ts

import { OrderType } from '@uniswap/uniswapx-sdk';
import { FetchOrdersParams } from '@/types/fetch-orders-params';
import { fetchIntents } from './lib/fetch-intents';

const main = async () => {
  const params: FetchOrdersParams = {
    chainId: 42161,
    limit: 10,
    orderStatus: 'open',
    sortKey: 'createdAt',
    desc: true,
    sort: 'lt(9000000000)',
    orderType: OrderType.Dutch_V2,
    includeV2: true,
  };

  const fetchAndLogIntents = async () => {
    try {
      const intents = await fetchIntents(params);
      console.log('Fetched intents:', intents);
    } catch (error) {
      console.error('Error fetching intents:', error);
    }
  };

  // Call fetchIntents immediately
  await fetchAndLogIntents();

  // Set up an interval to call fetchIntents every 1 second
  setInterval(fetchAndLogIntents, 1000);
};

// Run the main function
main().catch(error => {
  console.error('An error occurred in the main function:', error);
});
