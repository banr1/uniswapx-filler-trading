// main.ts

import { OrderType } from '@uniswap/uniswapx-sdk';
import { fetchIntents } from './lib/fetch-intents';
import { FetchOrdersParams } from './types/fetch-orders-params';
import { callExecute } from './lib/call-execute';
import { ERC20 } from './constants/erc20';
import { consola } from 'consola';

const monitorIntents = async () => {
  const chainId = 42161;
  const params: FetchOrdersParams = {
    chainId,
    limit: 2,
    orderStatus: 'open',
    sortKey: 'createdAt',
    desc: true,
    sort: 'lt(9000000000)',
    orderType: OrderType.Dutch_V2,
    includeV2: true,
  };

  try {
    const intents = await fetchIntents(params);
    if (intents.length == 0 || intents[0] === undefined) {
      consola.info('No intents found: ', { length: intents.length });
      return;
    }

    const intent = intents[0];
    consola.info('Intents found:', intent);

    // Check if the output token is USDC
    const outputToken = intent.outputs[0]!;
    const outputTokenName = ERC20[intent.chainId][outputToken.token]!.name;
    if (outputTokenName !== 'USDC') {
      consola.info('Output token is not USDC but:', outputTokenName);
      return;
    }

    if (outputToken.startAmount.gt(450_000_000)) {
      consola.info('Output amount is greater than 450 USDC:', outputToken.startAmount.toString());
      return;
    }

    await callExecute(intent, chainId);
  } catch (error) {
    consola.error('An error occurred in the monitorIntents function:', error);
  }
};

const main = async () => {
  // Call fetchIntents immediately
  await monitorIntents();

  // Set up an interval to call fetchIntents every 3.5 second
  setInterval(monitorIntents, 3500);
};

// Run the main function
main().catch(error => {
  consola.error('An error occurred in the main function:', error);
});
