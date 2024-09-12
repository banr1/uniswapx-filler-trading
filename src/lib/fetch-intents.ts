// lib/fetch-intents.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import axios from 'axios';
import { FetchOrdersParams } from '../types/fetch-orders-params';
import { RawOpenDutchIntentV2 } from '../types/dutch-intent-v2';
import { UNISWAPX_API_ENDPOINT } from '../constants/api-endpoint';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';
import consola from 'consola';

export async function fetchIntent(
  params: FetchOrdersParams,
): Promise<{ intent: CosignedV2DutchOrder; signature: string } | undefined> {
  const chainId = params.chainId;
  const permit2Address = PERMIT2ADDRESSES[chainId];

  const res = await axios.get<{ orders: RawOpenDutchIntentV2[] }>(UNISWAPX_API_ENDPOINT, { params });
  if (!res.data.orders.length) {
    return;
  }

  consola.info('Number of intents fetched:', res.data.orders.length);
  const rawIntent = res.data.orders[0];
  if (!rawIntent || rawIntent.type !== OrderType.Dutch_V2 || rawIntent.orderStatus !== 'open') {
    return;
  }
  const intent = CosignedV2DutchOrder.parse(rawIntent.encodedOrder, chainId, permit2Address);

  return {
    intent,
    signature: rawIntent.signature,
  };
}
