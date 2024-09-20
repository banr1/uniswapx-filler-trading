// main.ts

import { config } from './config';
import { logger } from './logger';
import { V2DutchOrderReactor__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { constants, providers, Wallet } from 'ethers';
import { IdentificationService } from './services/identification-service';
import { FillService } from './services/fill-service';
import { REACTOR_ADDRESS } from './constants';
import { sleep } from './utils';
import { ERC20__factory } from './types/typechain';

async function monitorIntent(
  identificationService: IdentificationService,
  fillService: FillService,
): Promise<void> {
  // Step 1: Identify the intent
  // Identify the intent from the UniswapX API
  const intent = await identificationService.identifyIntent();
  if (intent === null) return;

  // Step 2: Fill the intent
  // Fill the intent with the signature
  await fillService.fillIntent(intent);
}

async function main(): Promise<void> {
  // Prepare the environment
  const {
    chainId,
    alchemyUrl,
    privateKey,
    interval,
    targetInputTokenAddresses,
    targetOutputTokenAddresses,
  } = config;

  const provider = new providers.JsonRpcProvider(alchemyUrl);
  const wallet = new Wallet(privateKey, provider);
  const reactor = V2DutchOrderReactor__factory.connect(REACTOR_ADDRESS, wallet);

  const inputTokens = await Promise.all(
    targetInputTokenAddresses.map(async address =>
      ERC20__factory.connect(address, wallet),
    ),
  );

  const outputTokens = [];
  for (const address of targetOutputTokenAddresses) {
    const outputToken = ERC20__factory.connect(address, wallet);
    await outputToken.approve(REACTOR_ADDRESS, constants.MaxUint256);
    const outputTokenSymbol = await outputToken.symbol();
    logger.info(`Approved ${outputTokenSymbol}🖊️ for UniswapX Reactor`);
    outputTokens.push(outputToken);
  }
  logger.info('Preparation completed 🌱');

  // Initialize the services
  const identificationService = new IdentificationService({
    wallet,
    inputTokens,
    outputTokens,
    chainId,
  });
  const fillService = new FillService({
    wallet,
    reactor,
    inputTokens,
    outputTokens,
  });

  logger.info(
    `Starting the main function 🚀 with ${interval / 1000}s interval`,
  );

  while (true) {
    // const startTime = performance.now();
    await monitorIntent(identificationService, fillService);
    // const endTime = performance.now();
    // logger.info(`Execution time: ${Math.floor(endTime - startTime) / 1000}s`);
    await sleep(interval);
  }
}

main().catch(error => {
  logger.error(`An error occurred 🚨 in the main function: ${error}`);
});
