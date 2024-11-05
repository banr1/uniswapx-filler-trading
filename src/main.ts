// main.ts

import { config } from './config';
import { V2DutchOrderReactor__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { constants, providers, Wallet } from 'ethers';
import { IdentificationService } from './services/identification-service';
import { FillService } from './services/fill-service';
import { REACTOR_ADDRESS } from './constants';
import { bigNumberToDecimal, sleep } from './utils';
import { ERC20__factory } from './types/typechain';
import { ERC20State } from './erc20-state';
import { logger } from './logger';

async function defineTokens(
  targetInputTokenAddresses: string[],
  targetOutputTokenAddresses: string[],
  wallet: Wallet,
): Promise<{ inTokens: ERC20State[]; outTokens: ERC20State[] }> {
  const inTokens: ERC20State[] = [];
  for (const address of targetInputTokenAddresses) {
    const inputToken = ERC20__factory.connect(address, wallet);
    // await inputToken.approve(REACTOR_ADDRESS, constants.MaxUint256);
    const symbol = await inputToken.symbol();
    const decimals = await inputToken.decimals();
    const balance = bigNumberToDecimal(
      await inputToken.balanceOf(wallet.address),
      decimals,
    );
    // winston.info(`Approved🖊️ ${symbol} for UniswapX Reactor`);
    logger.info(`Balance💰: ${balance} ${symbol}`);
    inTokens.push({
      address,
      symbol,
      balance,
      decimals,
    });
  }

  const outTokens: ERC20State[] = [];
  // Run sequentially to avoid nonce issues
  for (const address of targetOutputTokenAddresses) {
    const outputToken = ERC20__factory.connect(address, wallet);
    await outputToken.approve(REACTOR_ADDRESS, constants.MaxUint256);
    const symbol = await outputToken.symbol();
    const decimals = await outputToken.decimals();
    const balance = bigNumberToDecimal(
      await outputToken.balanceOf(wallet.address),
      decimals,
    );
    logger.info(`Approved🖊️ ${symbol} for UniswapX Reactor`);
    logger.info(`Balance💰: ${balance} ${symbol}`);
    outTokens.push({
      address,
      symbol,
      balance,
      decimals,
    });
  }

  return { inTokens, outTokens };
}

async function monitorIntent(
  identificationService: IdentificationService,
  fillService: FillService,
): Promise<boolean | null> {
  // Step 1: Identify the intent
  // Identify the intent from the UniswapX API
  const intent = await identificationService.identifyIntent();
  if (intent === null) return null;

  // Step 2: Fill the intent
  // Fill the intent with the signature
  const isFilled = await fillService.fillIntent(intent);
  return isFilled;
}

async function main(): Promise<void> {
  // Prepare the environment
  const {
    alchemyUrl,
    privateKey,
    interval,
    targetInputTokenAddresses,
    targetOutputTokenAddresses,
  } = config;

  let identificationService: IdentificationService;

  const provider = new providers.JsonRpcProvider(alchemyUrl);
  const wallet = new Wallet(privateKey, provider);
  const reactor = V2DutchOrderReactor__factory.connect(REACTOR_ADDRESS, wallet);
  const fillService = new FillService({ reactor });

  let isFilled: boolean = true;
  while (true) {
    if (isFilled) {
      // Define the tokens
      const { inTokens, outTokens } = await defineTokens(
        targetInputTokenAddresses,
        targetOutputTokenAddresses,
        wallet,
      );

      logger.info('Preparation completed 🌱');

      // Initialize the services
      identificationService = new IdentificationService({
        inTokens,
        outTokens,
      });

      logger.info(
        `Starting the main function 🚀 with ${interval / 1000}s interval`,
      );
    }

    isFilled = (await monitorIntent(identificationService!, fillService))
      ? true
      : false;
    await sleep(interval);
  }
}

main();
