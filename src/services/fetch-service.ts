// services/api-service.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import { FetchOrdersParams } from '../types/fetch-orders-params';
import axios from 'axios';
import { RawOpenDutchIntentV2 } from '../types/raw-dutch-intent-v2';
import { config } from '../config';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';
import { ChainId } from '../types/chain-id';
import { MockERC20 as ERC20, MockERC20__factory as ERC20__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { providers, Wallet } from 'ethers';
import { Address } from '../types/hash';
import { formatUnits } from 'ethers/lib/utils';
import { nowTimestamp } from '../utils';
import { logger } from '../logger';

export class FetchService {
  private baseUrl: string;
  private chainId: ChainId;
  private filler: Address;
  private provider: providers.JsonRpcProvider;
  private outputToken: ERC20;

  constructor() {
    this.baseUrl = 'https://api.uniswap.org';
    this.chainId = config.chainId;
    this.filler = new Wallet(config.privateKey).address;
    this.provider = new providers.JsonRpcProvider(config.alchemyUrl);
    this.outputToken = ERC20__factory.connect('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', this.provider); // USDT
  }

  async fetchIntent(): Promise<{ intent: CosignedV2DutchOrder; signature: string } | null> {
    const params: FetchOrdersParams = {
      chainId: this.chainId,
      limit: 2,
      orderStatus: 'open',
      sortKey: 'createdAt',
      desc: true,
      sort: 'lt(9000000000)',
      orderType: OrderType.Dutch_V2,
      includeV2: true,
    };
    const tokenBalance = await this.outputToken.balanceOf(this.filler);
    const tokenSymbol = await this.outputToken.symbol();
    const tokenDecimals = await this.outputToken.decimals();

    try {
      const response = await axios.get<{ orders: RawOpenDutchIntentV2[] }>(`${this.baseUrl}/v2/orders`, { params });
      if (!response.data.orders.length) {
        logger.info(`No intents found 🍪 (${formatUnits(tokenBalance, tokenDecimals)} ${tokenSymbol})`);
        return null;
      }

      const rawIntent = response.data.orders[0];
      if (!rawIntent || rawIntent.type !== OrderType.Dutch_V2 || rawIntent.orderStatus !== 'open') {
        logger.info(`No intents found 🍪 (${formatUnits(tokenBalance, tokenDecimals)} ${tokenSymbol})`);
        return null;
      }

      const supportedInputTokenSymbols = ['WETH', 'USDC', 'DAI', 'WBTC'];
      const inputToken = ERC20__factory.connect(rawIntent.input.token, this.provider);
      const inputSymbol = await inputToken.symbol();
      if (!supportedInputTokenSymbols.includes(inputSymbol)) {
        logger.info(`An intent found!✨ But input token is not supported: ${inputSymbol}`);
        return null;
      }

      const supportedOutputTokenSymbol = 'USDT';
      const token = ERC20__factory.connect(rawIntent.outputs[0]!.token, this.provider);
      const outputSymbol = await token.symbol();

      if (outputSymbol !== supportedOutputTokenSymbol) {
        logger.info(`An intent found!✨ But output token is not supported: ${outputSymbol}`);
        return null;
      }

      const endTime = rawIntent.cosignerData.decayEndTime;
      if (endTime < nowTimestamp()) {
        logger.info(`An intent found!✨ But it is expired: ${new Date(endTime * 1000)}`);
        return null;
      }

      const intent = this.parseIntent(rawIntent);

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
    return CosignedV2DutchOrder.parse(rawIntent.encodedOrder, this.chainId, PERMIT2ADDRESSES[this.chainId]);
  }
}

export const fetchService = new FetchService();
