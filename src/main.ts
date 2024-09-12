// main.ts

import { OrderType } from '@banr1/uniswapx-sdk';
import { fetchIntent } from './lib/fetch-intents';
import { FetchOrdersParams } from './types/fetch-orders-params';
import { callExecute } from './lib/call-execute';
import { ERC20 } from './constants/erc20';
import { consola } from 'consola';
import { ethers } from 'ethers';
import { callApprove } from './lib/call-approve';
import { MockERC20__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { formatUnits } from 'ethers/lib/utils';
import { IntentHash } from './types/hash';
import { config } from './config';

const SUPPORT_OUTPUT_TOKENS = ['USDC', 'USDT'];

async function monitorIntents(): Promise<void> {
  let justFilledIntentHash: IntentHash | null = null;
  let justSkippedIntentHash: IntentHash | null = null;

  const { chainId, privateKey, alchemyApiKey } = config;

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

  const provider = new ethers.providers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`);
  const signer = new ethers.Wallet(privateKey, provider);
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
    const intentAndSignature = await fetchIntent(params);
    if (intentAndSignature === null) {
      consola.info('No intents found 🍪');
      justFilledIntentHash = null;
      return;
    }
    const { intent } = intentAndSignature;
    const intentHash = intent.hash();
    const cosigner = intent.recoverCosigner();
    const resolvedIntent = intent.resolve({ timestamp: Math.floor(Date.now() / 1000) });

    if (justFilledIntentHash && justFilledIntentHash === intentHash) {
      consola.info('This intent has already been executed 💫');
      return;
    }
    if (justSkippedIntentHash && justSkippedIntentHash === intentHash) {
      consola.info('This intent has already been skipped 💫');
      return;
    }

    // Check if the output token is USDC/USDT
    const outputToken = intent.info.outputs[0]!;
    const outputTokenName = ERC20[chainId][outputToken.token]!.name;
    if (!SUPPORT_OUTPUT_TOKENS.includes(outputTokenName)) {
      consola.info('An intent found!✨ But output token is not supported but', outputTokenName);
      consola.info('intent info:', intent);
      consola.info('cosigner:', cosigner);
      consola.info('resolved intent:', resolvedIntent);
      justSkippedIntentHash = intentHash;
      return;
    }

    if (outputToken.startAmount.gt(250_000_000)) {
      consola.info(
        'An USDC/USDT intent found!✨ But output amount is greater than 250 (',
        outputToken.startAmount.toString(),
        ')',
      );
      consola.info('intent info:', intent);
      consola.info('cosigner:', cosigner);
      consola.info('resolved intent:', resolvedIntent);
      justSkippedIntentHash = intentHash;
      return;
    }
    consola.info('An USDC/USDT intent found!!✨');
    consola.info('intent info:', intent);
    consola.info('cosigner:', cosigner);
    consola.info('resolved intent:', resolvedIntent);

    // Approve the output token if it is not USDC/USDT
    if (!SUPPORT_OUTPUT_TOKENS.includes(outputTokenName)) {
      const approveTxReceipt = await callApprove(intent, signer);
      consola.success(outputTokenName, ' approved successfully!!🎉 Tx receipt:', approveTxReceipt);
    } else {
      consola.info('USDC/USDT already approved ✅');
    }

    const executeTxReceipt = await callExecute(intentAndSignature, signer);
    justFilledIntentHash = intentHash;

    consola.success('intent executed successfully!!🎉 Tx receipt:', executeTxReceipt);
  } catch (error) {
    consola.error('An error occurred 🚨 in the monitorIntents function:', error);
  }
}

const main = async () => {
  const { interval } = config;
  consola.info('Starting the main function 🚀 with', interval / 1000, 's interval');

  await monitorIntents();

  setInterval(monitorIntents, interval);
};

main().catch(error => {
  consola.error('An error occurred 🚨 in the main function:', error);
});
