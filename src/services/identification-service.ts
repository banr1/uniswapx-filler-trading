// services/identification-service.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import { FetchIntentsParams } from '../types/fetch-intents-params';
import axios from 'axios';
import { RawOpenDutchIntentV2 } from '../types/raw-dutch-intent-v2';
import { Wallet } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { getSupportedToken, nowTimestamp } from '../utils';
import { logger } from '../logger';
import { ChainId } from '../types/chain-id';
import { PERMIT2_ADDRESS } from '../constants';
import { Erc20, Erc20__factory } from '../types/typechain';
import { IntentWithSignature } from '../types/intent-with-signature';

interface IdentificationServiceConstructorArgs {
  wallet: Wallet;
  inputTokens: Erc20[];
  outputTokens: Erc20[];
  chainId: ChainId;
}

export class IdentificationService {
  private wallet: Wallet;
  private inputTokens: Erc20[];
  private outputTokens: Erc20[];
  private chainId: ChainId;
  private apiBaseUrl = 'https://api.uniswap.org';

  constructor({
    wallet,
    inputTokens,
    outputTokens,
    chainId,
  }: IdentificationServiceConstructorArgs) {
    this.wallet = wallet;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
    this.chainId = chainId;
  }

  async identifyIntent(): Promise<IntentWithSignature | null> {
    const params: FetchIntentsParams = {
      chainId: this.chainId,
      limit: 1,
      orderStatus: 'open',
      sortKey: 'createdAt',
      desc: true,
      sort: 'lt(9000000000)',
      orderType: OrderType.Dutch_V2,
      includeV2: true,
    };

    try {
      return await this._identifyIntent(params);
    } catch (error) {
      logger.error(`Error🚨 fetching orders: ${error}`);
      throw error;
    }
  }

  private async _identifyIntent(
    params: FetchIntentsParams,
  ): Promise<IntentWithSignature | null> {
    const response = await axios.get<{ orders: RawOpenDutchIntentV2[] }>(
      `${this.apiBaseUrl}/v2/orders`,
      { params },
    );
    if (!response.data.orders.length) {
      // log only when seconds is 0
      if (new Date().getSeconds() === 0) {
        logger.info(`No intents found 🍪`);
      }
      return null;
    }

    const rawIntent = response.data.orders[0];
    if (
      !rawIntent ||
      rawIntent.type !== OrderType.Dutch_V2 ||
      rawIntent.orderStatus !== 'open'
    ) {
      logger.info(`An intent found!✨ But it is not a Dutch V2 intent`);
      return null;
    }

    const intentInputToken = getSupportedToken(
      rawIntent.input,
      this.inputTokens,
    );
    if (!intentInputToken) {
      const intentInputTokenSymbol = await Erc20__factory.connect(
        rawIntent.input.token,
        this.wallet.provider,
      ).symbol();
      logger.info(
        `An intent found!✨ But input token is not supported: ${intentInputTokenSymbol}`,
      );
      return null;
    }
    const intentOutputToken = getSupportedToken(
      rawIntent.outputs[0]!,
      this.outputTokens,
    );
    if (!intentOutputToken) {
      const intentOutputTokenSymbol = await Erc20__factory.connect(
        rawIntent.outputs[0]!.token,
        this.wallet.provider,
      ).symbol();
      logger.info(
        `An intent found!✨ But output token is not supported: ${intentOutputTokenSymbol}`,
      );
      return null;
    }

    const startTime = rawIntent.cosignerData.decayStartTime;
    if (startTime > nowTimestamp()) {
      logger.info(
        `An intent found!✨ But it is not started yet: ${new Date(startTime * 1000)}`,
      );
      return null;
    }

    const endTime = rawIntent.cosignerData.decayEndTime;
    if (endTime < nowTimestamp()) {
      logger.info(
        `An intent found!✨ But it is expired: ${new Date(endTime * 1000)}`,
      );
      return null;
    }

    const intent = CosignedV2DutchOrder.parse(
      rawIntent.encodedOrder,
      this.chainId,
      PERMIT2_ADDRESS,
    );

    const resolvedAmount = intent.resolve({ timestamp: nowTimestamp() })
      .outputs[0]!.amount;
    const outputTokenBalance = await intentOutputToken.balanceOf(
      this.wallet.address,
    );
    if (outputTokenBalance.lt(resolvedAmount)) {
      const tokenSymbol = await intentOutputToken.symbol();
      const tokenDecimals = await intentOutputToken.decimals();
      logger.info(
        `An intent found!✨ But balance is not enough (resolved amount: ${formatUnits(resolvedAmount, tokenDecimals)} ${tokenSymbol} balance: ${formatUnits(outputTokenBalance, tokenDecimals)} ${tokenSymbol})`,
      );
      return null;
    }

    logger.info('An suitable intent found!✨');
    logger.info(`Intent: ${intent}`);

    return {
      intent,
      signature: rawIntent.signature,
    };
  }
}
