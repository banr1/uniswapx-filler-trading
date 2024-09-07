// main.ts

import { OrderType } from '@uniswap/uniswapx-sdk';
import { fetchIntents } from './lib/fetch-intents';
import { FetchOrdersParams } from './types/fetch-orders-params';
import { callExecute } from './lib/call-execute';
import { ERC20 } from './constants/erc20';
import { consola } from 'consola';
import { ethers } from 'ethers';
import { callApprove } from './lib/call-approve';
import { MockERC20__factory } from '@uniswap/uniswapx-sdk/dist/src/contracts';
import { formatUnits } from 'ethers/lib/utils';

const SUPPORT_OUTPUT_TOKENS = ['USDC', 'USDT'];

const monitorIntents = async () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is not set');
  }

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

  const provider = new ethers.providers.JsonRpcProvider(
    'https://arb-mainnet.g.alchemy.com/v2/f5kl3xhwBkEw2ECT58X2yHGsrb6b-z4A',
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
  const ethBalance = await provider.getBalance(signer.address);
  const usdcBalance = await MockERC20__factory.connect(
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    provider,
  ).balanceOf(signer.address);
  const usdtBalance = await MockERC20__factory.connect(
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    provider,
  ).balanceOf(signer.address);
  consola.info(
    "signer's balances 🏦 :",
    formatUnits(ethBalance, 18),
    'ETH,',
    formatUnits(usdcBalance, 6),
    'USDC,',
    formatUnits(usdtBalance, 6),
    'USDT',
  );

  try {
    const intents = await fetchIntents(params);
    if (intents.length == 0 || intents[0] === undefined) {
      consola.info('No intents found 🍪');
      return;
    }

    const intent = intents[0];

    // Check if the output token is USDC/USDT
    const outputToken = intent.outputs[0]!;
    const outputTokenName = ERC20[chainId][outputToken.token]!.name;
    if (!SUPPORT_OUTPUT_TOKENS.includes(outputTokenName)) {
      consola.info('An intent found!✨ But output token is not supported but', outputTokenName);
      return;
    }

    if (outputToken.startAmount.gt(250_000_000)) {
      consola.info(
        'An USDC/USDT intent found!✨ But output amount is greater than 250 (',
        outputToken.startAmount.toString(),
        ')',
      );
      return;
    }
    consola.info('An USDC/USDT intent found!!✨:', intent);

    // Approve the output token if it is not USDC/USDT
    if (!SUPPORT_OUTPUT_TOKENS.includes(outputTokenName)) {
      const approveTxReceipt = await callApprove(intent, signer);
      consola.success(outputTokenName, ' approved successfully!!🎉 Tx receipt:', approveTxReceipt);
    } else {
      consola.info('USDC/USDT already approved ✅');
    }

    const executeTxReceipt = await callExecute(intent, signer, provider);
    consola.success('intent executed successfully!!🎉 Tx receipt:', executeTxReceipt);
  } catch (error) {
    consola.error('An error occurred 🚨 in the monitorIntents function:', error);
  }
};

const main = async () => {
  const interval = 3500;
  consola.info('Starting the main function 🚀 with', interval / 1000, 's interval');

  // Call fetchIntents immediately
  await monitorIntents();

  // Set up an interval to call fetchIntents every 3.5 second
  setInterval(monitorIntents, interval);
};

// Run the main function
main().catch(error => {
  consola.error('An error occurred 🚨 in the main function:', error);
});
