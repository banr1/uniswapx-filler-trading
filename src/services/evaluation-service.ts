// services/evaluation-service.ts

import { MockERC20 as ERC20, MockERC20__factory as ERC20__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { Address } from '../types/hash';
import { ethers } from 'ethers';
import { config } from '../config';
import consola from 'consola';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { nowTimestamp } from '../utils';
import { formatUnits } from 'ethers/lib/utils';

export class EvaluationService {
  private filler: Address;
  private provider: ethers.providers.JsonRpcProvider;
  private outputToken: ERC20;

  constructor() {
    this.filler = new ethers.Wallet(config.privateKey).address;
    this.provider = new ethers.providers.JsonRpcProvider(config.alchemyUrl);
    this.outputToken = ERC20__factory.connect('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', this.provider); // USDT
  }

  async evaluateIntent(intent: CosignedV2DutchOrder): Promise<void | null> {
    const tokenSymbol = await this.outputToken.symbol();
    const tokenDecimals = await this.outputToken.decimals();

    const resolvedAmount = intent.resolve({ timestamp: nowTimestamp() }).outputs[0]!.amount;
    const balance = await this.outputToken.balanceOf(this.filler);
    if (balance.lt(resolvedAmount)) {
      consola.info(
        'An',
        tokenSymbol,
        'intent found!✨ But balance is not enough (resolved amount:',
        formatUnits(resolvedAmount, tokenDecimals),
        'balance:',
        formatUnits(balance, tokenDecimals),
        ')',
      );
      return null;
    }

    consola.info('An suitable intent found!✨');
    return;
  }
}

export const evaluationService = new EvaluationService();
