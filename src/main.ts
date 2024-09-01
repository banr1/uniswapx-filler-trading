// main.ts

import { OrderType } from '@uniswap/uniswapx-sdk';
import { fetchIntents } from './lib/fetch-intents';
import { FetchOrdersParams } from './types/fetch-orders-params';
import { callExecute } from './lib/call-execute';

const monitorIntents = async () => {
  const chainId = 42161;
  const permit2Address = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
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
    const intents = await fetchIntents(params, permit2Address);
    if (intents.length > 0) {
      const intent = intents[0];
      if (intent === undefined) return;
      await callExecute(intent, chainId, permit2Address);
    } else {
      console.log('No intents found');
    }
  } catch (error) {
    console.error('An error occurred in the monitorIntents function:', error);
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
  console.error('An error occurred in the main function:', error);
});
