// services/preparation-service.ts

import {
  MockERC20 as ERC20,
  MockERC20__factory as ERC20__factory,
  V2DutchOrderReactor,
  V2DutchOrderReactor__factory,
} from '@banr1/uniswapx-sdk/dist/src/contracts';
import { constants, providers, Wallet } from 'ethers';
import { config } from '../config';
import { logger } from '../logger';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';

export type Preparation = {
  filler: Wallet;
  provider: providers.JsonRpcProvider;
  outputToken: ERC20;
  reactor: V2DutchOrderReactor;
};

export class PreparationService {
  constructor() {}

  async initialize(): Promise<Preparation> {
    const provider = new providers.JsonRpcProvider(config.alchemyUrl);
    const filler = new Wallet(config.privateKey, provider);
    const outputToken = ERC20__factory.connect('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', filler); // USDT
    const reactor = V2DutchOrderReactor__factory.connect(UNISWAP_REACTOR_ADDRESSES[config.chainId], filler);
    await outputToken.approve(UNISWAP_REACTOR_ADDRESSES[config.chainId], constants.MaxUint256);

    logger.info('Preparation completed 🎉');

    return { outputToken, filler, provider, reactor };
  }
}

export const preparationService = new PreparationService();
