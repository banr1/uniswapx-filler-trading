// services/identification-service.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import { FetchOrdersParams } from '../types/fetch-orders-params';
import axios from 'axios';
import { RawOpenDutchIntentV2 } from '../types/raw-dutch-intent-v2';
import { config } from '../config';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';
import { MockERC20 as ERC20, MockERC20__factory as ERC20__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { providers, Wallet } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { nowTimestamp } from '../utils';
import { logger } from '../logger';

interface IdentificationServiceConstructorArgs {
  filler: Wallet;
  provider: providers.JsonRpcProvider;
  inputTokens: ERC20[];
  outputTokens: ERC20[];
}

export class IdentificationService {
  private filler: Wallet;
  private provider: providers.JsonRpcProvider;
  private inputTokens: ERC20[];
  private outputTokens: ERC20[];
  private apiBaseUrl = 'https://api.uniswap.org';

  constructor({ filler, provider, inputTokens, outputTokens }: IdentificationServiceConstructorArgs) {
    this.filler = filler;
    this.provider = provider;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
  }

  async identifyIntent(): Promise<{ intent: CosignedV2DutchOrder; signature: string } | null> {
    const params: FetchOrdersParams = {
      chainId: config.chainId,
      limit: 2,
      orderStatus: 'open',
      sortKey: 'createdAt',
      desc: true,
      sort: 'lt(9000000000)',
      orderType: OrderType.Dutch_V2,
      includeV2: true,
    };

    try {
      const response = await axios.get<{ orders: RawOpenDutchIntentV2[] }>(`${this.apiBaseUrl}/v2/orders`, { params });
      if (!response.data.orders.length) {
        logger.info(`No intents found 🍪`);
        return null;
      }

      const rawIntent = response.data.orders[0];
      if (!rawIntent || rawIntent.type !== OrderType.Dutch_V2 || rawIntent.orderStatus !== 'open') {
        logger.info(`No intents found 🍪`);
        return null;
      }

      const intentInputToken = ERC20__factory.connect(rawIntent.input.token, this.provider);
      if (!this.inputTokens.includes(intentInputToken)) {
        const intentInputTokenSymbol = await intentInputToken.symbol();
        logger.info(`An intent found!✨ But input token is not supported: ${intentInputTokenSymbol}`);
        return null;
      }

      const intentOutputToken = ERC20__factory.connect(rawIntent.outputs[0]!.token, this.provider);
      if (!this.outputTokens.includes(intentOutputToken)) {
        const intentOutputTokenSymbol = await intentOutputToken.symbol();
        logger.info(`An intent found!✨ But output token is not supported: ${intentOutputTokenSymbol}`);
        return null;
      }

      const endTime = rawIntent.cosignerData.decayEndTime;
      if (endTime < nowTimestamp()) {
        logger.info(`An intent found!✨ But it is expired: ${new Date(endTime * 1000)}`);
        return null;
      }

      const intent = this.parseIntent(rawIntent);

      const resolvedAmount = intent.resolve({ timestamp: nowTimestamp() }).outputs[0]!.amount;
      const outputTokenBalance = await intentOutputToken.balanceOf(this.filler.address);
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
    } catch (error) {
      logger.error(`Error🚨 fetching orders: ${error}`);
      throw error;
    }
  }

  private parseIntent(rawIntent: RawOpenDutchIntentV2): CosignedV2DutchOrder {
    return CosignedV2DutchOrder.parse(rawIntent.encodedOrder, config.chainId, PERMIT2ADDRESSES[config.chainId]);
  }
}
