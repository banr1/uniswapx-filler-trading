// services/reactor-contract-service.ts

import { config } from '../config';
import {
  MockERC20 as ERC20,
  MockERC20__factory as ERC20__factory,
  V2DutchOrderReactor,
  V2DutchOrderReactor__factory,
} from '@banr1/uniswapx-sdk/dist/src/contracts';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { logger } from '../logger';
import { constants, providers, Wallet } from 'ethers';

export class FillService {
  private filler: Wallet;
  private provider: providers.JsonRpcProvider;
  private reactor: V2DutchOrderReactor;
  private outputToken: ERC20;

  constructor() {
    this.provider = new providers.JsonRpcProvider(config.alchemyUrl);
    this.filler = new Wallet(config.privateKey, this.provider);
    this.reactor = V2DutchOrderReactor__factory.connect(UNISWAP_REACTOR_ADDRESSES[config.chainId], this.filler);
    this.outputToken = ERC20__factory.connect('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', this.filler); // USDT
  }

  async fillIntent({ intent, signature }: { intent: CosignedV2DutchOrder; signature: string }) {
    const signedIntent = {
      order: intent.serialize(),
      sig: signature,
    };

    const gasLimit = 600_000;
    const ethBalance = await this.provider.getBalance(this.filler.address);
    if (ethBalance.lt(gasLimit)) {
      logger.error(`Insufficient ETH balance for gas fee ☃️: ${ethBalance}`);
    }

    try {
      await this.outputToken.approve(UNISWAP_REACTOR_ADDRESSES[config.chainId], constants.MaxUint256);

      const tx = await this.reactor.execute(signedIntent, { gasLimit });
      const txReceipt = await tx.wait();
      logger.info(`txReceipt: ${txReceipt}`);
    } catch (error) {
      throw error;
    }
  }
}

export const fillService = new FillService();
