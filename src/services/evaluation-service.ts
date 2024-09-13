// services/evaluation-service.ts

import { MockERC20, MockERC20__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { Address } from '../types/hash';
import { ethers } from 'ethers';
import { config } from '../config';
import consola from 'consola';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';

export class EvaluationService {
  private filler: Address;
  private outputToken: MockERC20;

  constructor() {
    this.filler = new ethers.Wallet(config.privateKey).address;
    const provider = new ethers.providers.JsonRpcProvider(config.alchemyUrl);
    this.outputToken = MockERC20__factory.connect('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', provider); // USDT
  }

  async evaluateIntent(intent: CosignedV2DutchOrder): Promise<boolean> {
    const outputToken = intent.info.outputs[0]!;
    if (outputToken.token !== this.outputToken.address) {
      consola.info('An intent found!✨ But output token is not USDT but', this.outputToken.name());
      return false;
    }
    const outputTokenBalance = await this.outputToken.balanceOf(this.filler);
    if (outputTokenBalance.lt(outputToken.startAmount)) {
      consola.info('An USDT intent found!✨ But balance is not enough (', outputTokenBalance.toString(), ')');
      return false;
    }

    consola.info('An USDT intent found!!✨');
    return true;
  }
}

export const evaluationService = new EvaluationService();
