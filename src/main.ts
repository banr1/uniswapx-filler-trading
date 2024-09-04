// main.ts

import { OrderType } from '@uniswap/uniswapx-sdk';
import { fetchIntents } from './lib/fetch-intents';
import { FetchOrdersParams } from './types/fetch-orders-params';
import { callExecute } from './lib/call-execute';
import { ERC20 } from './constants/erc20';
import { consola } from 'consola';
import { ethers } from 'ethers';
import { callApprove } from './lib/call-approve';

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
      consola.info('No intents found');
      return;
    }

    const intent = intents[0];

    // Check if the output token is USDC
    const outputToken = intent.outputs[0]!;
    const outputTokenName = ERC20[chainId][outputToken.token]!.name;
    if (outputTokenName !== 'USDC') {
      consola.info('An intent found!✨ But output token is not USDC but', outputTokenName);
      return;
    }

    if (outputToken.startAmount.gt(450_000_000)) {
      consola.info(
        'An USDC intent found!✨ But output amount is greater than 450 USDC (',
        outputToken.startAmount.toString(),
        ')',
      );
      return;
    }
    consola.info('An USDC intent found!!✨:', intent);

    const provider = new ethers.providers.JsonRpcProvider(
      'https://arb-mainnet.g.alchemy.com/v2/f5kl3xhwBkEw2ECT58X2yHGsrb6b-z4A',
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);

    // Approve the output token if it is not USDC
    if (outputTokenName !== 'USDC') {
      const approveTxReceipt = await callApprove(intent, signer);
      consola.success(outputTokenName, ' approved successfully!!🎉 Tx receipt:', approveTxReceipt);
    } else {
      consola.info('USDC already approved');
    }

    const executeTxReceipt = await callExecute(intent, signer, provider);
    consola.success('Intent executed successfully!!🎉 Tx receipt:', executeTxReceipt);
  } catch (error) {
    consola.error('An error occurred🚨 in the monitorIntents function:', error);
  }
};

const main = async () => {
  const interval = 3500;
  consola.info('Starting the main function with', interval / 1000, 's interval');

  // Call fetchIntents immediately
  await monitorIntents();

  // Set up an interval to call fetchIntents every 3.5 second
  setInterval(monitorIntents, interval);
};

// Run the main function
main().catch(error => {
  consola.error('An error occurred in the main function:', error);
});
