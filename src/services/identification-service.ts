// services/identification-service.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import { FetchOrdersParams } from '../types/fetch-orders-params';
import axios from 'axios';
import { RawOpenDutchIntentV2 } from '../types/raw-dutch-intent-v2';
import { MockERC20 as ERC20 } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { Wallet } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { getSupportedToken, nowTimestamp } from '../utils';
import { logger } from '../logger';
import { PERMIT2_ADDRESS } from '../constants/permit2-addresses';
import { ChainId } from '../types/chain-id';

interface IdentificationServiceConstructorArgs {
  wallet: Wallet;
  inputTokens: ERC20[];
  outputTokens: ERC20[];
  chainId: ChainId;
}

export class IdentificationService {
  private wallet: Wallet;
  private inputTokens: ERC20[];
  private outputTokens: ERC20[];
  private chainId: ChainId;
  private apiBaseUrl = 'https://api.uniswap.org';

  constructor({ wallet, inputTokens, outputTokens, chainId }: IdentificationServiceConstructorArgs) {
    this.wallet = wallet;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
    this.chainId = chainId;
  }

  async identifyIntent(): Promise<{ intent: CosignedV2DutchOrder; signature: string } | null> {
    const params: FetchOrdersParams = {
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

      const intentInputToken = getSupportedToken(rawIntent.input, this.inputTokens);
      if (!intentInputToken) {
        logger.info(`An intent found!✨ But input token is not supported: ${rawIntent.input.token}`);
        return null;
      }
      const intentOutputToken = getSupportedToken(rawIntent.outputs[0]!, this.outputTokens);
      if (!intentOutputToken) {
        logger.info(`An intent found!✨ But output token is not supported: ${rawIntent.outputs[0]!.token}`);
        return null;
      }

      const endTime = rawIntent.cosignerData.decayEndTime;
      if (endTime < nowTimestamp()) {
        logger.info(`An intent found!✨ But it is expired: ${new Date(endTime * 1000)}`);
        return null;
      }

      const intent = this.parseIntent(rawIntent);

      const resolvedAmount = intent.resolve({ timestamp: nowTimestamp() }).outputs[0]!.amount;
      const outputTokenBalance = await intentOutputToken.balanceOf(this.wallet.address);
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
    return CosignedV2DutchOrder.parse(rawIntent.encodedOrder, this.chainId, PERMIT2_ADDRESS);
  }
}
