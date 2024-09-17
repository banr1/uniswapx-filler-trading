// main.ts

import { config } from './config';
import { logger } from './logger';
import {
  MockERC20__factory as ERC20__factory,
  V2DutchOrderReactor__factory,
} from '@banr1/uniswapx-sdk/dist/src/contracts';
import { constants, providers, Wallet } from 'ethers';
import { UNISWAP_REACTOR_ADDRESSES } from './constants/uniswap-reactor-addresses';
import { IdentificationService } from './services/identification-service';
import { FillService } from './services/fill-service';

async function monitorIntent(identificationService: IdentificationService, fillService: FillService): Promise<void> {
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
  const { chainId, alchemyUrl, privateKey, interval } = config;
  const reactorAddress = UNISWAP_REACTOR_ADDRESSES[chainId];

  const provider = new providers.JsonRpcProvider(alchemyUrl);
  const filler = new Wallet(privateKey, provider);
  const outputToken = ERC20__factory.connect('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', filler); // USDT
  const reactor = V2DutchOrderReactor__factory.connect(reactorAddress, filler);
  await outputToken.approve(reactorAddress, constants.MaxUint256);

  logger.info('Preparation completed 🌱');

  // Initialize the services
  const identificationService = new IdentificationService({ filler, provider, outputToken });
  const fillService = new FillService({ reactor });

  logger.info(`Starting the main function 🚀 with ${interval / 1000}s interval`);
  setInterval(monitorIntent, interval, identificationService, fillService);
}

main().catch(error => {
  logger.error(`An error occurred 🚨 in the main function: ${error}`);
});
