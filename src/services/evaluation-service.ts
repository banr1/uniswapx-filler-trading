// services/evaluation-service.ts

import { MockERC20 as ERC20 } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { nowTimestamp } from '../utils';
import { formatUnits } from 'ethers/lib/utils';
import { logger } from '../logger';
import { Wallet } from 'ethers';

export class EvaluationService {
  private filler: Wallet;
  private outputToken: ERC20;

  constructor({ filler, outputToken }: { filler: Wallet; outputToken: ERC20 }) {
    this.filler = filler;
    this.outputToken = outputToken;
  }

  async evaluateIntent(intent: CosignedV2DutchOrder): Promise<void | null> {
    const tokenSymbol = await this.outputToken.symbol();
    const tokenDecimals = await this.outputToken.decimals();

    const resolvedAmount = intent.resolve({ timestamp: nowTimestamp() }).outputs[0]!.amount;
    const balance = await this.outputToken.balanceOf(this.filler.address);
    if (balance.lt(resolvedAmount)) {
      logger.info(
        `An ${tokenSymbol} intent found!✨ But balance is not enough (resolved amount: ${formatUnits(resolvedAmount, tokenDecimals)} ${tokenSymbol} balance: ${formatUnits(balance, tokenDecimals)} ${tokenSymbol})`,
      );
      return null;
    }

    logger.info('An suitable intent found!✨');
    logger.info(`Intent: ${intent}`);
    return;
  }
}
