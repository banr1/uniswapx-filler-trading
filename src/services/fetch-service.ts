// services/api-service.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import { FetchOrdersParams } from '../types/fetch-orders-params';
import axios from 'axios';
import { RawOpenDutchIntentV2 } from '../types/raw-dutch-intent-v2';
import { config } from '../config';
import consola from 'consola';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';
import { ChainId } from '../types/chain-id';

export class FetchService {
  private baseUrl: string;
  private chainId: ChainId;

  constructor() {
    this.baseUrl = 'https://api.uniswap.org';
    this.chainId = config.chainId;
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

    try {
      const response = await axios.get<{ orders: RawOpenDutchIntentV2[] }>(`${this.baseUrl}/v2/orders`, { params });
      if (!response.data.orders.length) {
        consola.info('No intents found 🍪');
        return null;
      }

      const rawIntent = response.data.orders[0];
      if (!rawIntent || rawIntent.type !== OrderType.Dutch_V2 || rawIntent.orderStatus !== 'open') {
        consola.info('No intents found 🍪');
        return null;
      }

      const intent = this.parseIntent(rawIntent);

      return {
        intent,
        signature: rawIntent.signature,
      };
    } catch (error) {
      consola.error('Error fetching orders:', error);
      throw error;
    }
  }

  private parseIntent(rawIntent: RawOpenDutchIntentV2): CosignedV2DutchOrder {
    return CosignedV2DutchOrder.parse(rawIntent.encodedOrder, this.chainId, PERMIT2ADDRESSES[this.chainId]);
  }
}

export const fetchService = new FetchService();
