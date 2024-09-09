// lib/fetch-intents.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import axios from 'axios';
import { FetchOrdersParams } from '../types/fetch-orders-params';
import { OpenDutchIntentV2, RawOpenDutchIntentV2 } from '../types/dutch-intent-v2';
import { UNISWAPX_API_ENDPOINT } from '../constants/api-endpoint';
import { ChainId } from '../types/chain-id';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';

export async function fetchIntents(params: FetchOrdersParams): Promise<OpenDutchIntentV2[]> {
  let intents;
  if (params.orderType === OrderType.Dutch_V2) {
    const res = await axios.get<{ orders: RawOpenDutchIntentV2[] }>(UNISWAPX_API_ENDPOINT, { params });
    intents = res.data.orders.map(order => decodeOrderV2(order, params.chainId));
  } else {
    throw new Error('Invalid order type');
  }

  return intents;
}

const decodeOrderV2 = (order: RawOpenDutchIntentV2, chainId: ChainId): OpenDutchIntentV2 => {
  if (!['open'].includes(order.orderStatus)) {
    throw new Error('Invalid order status');
  }

  const parsedOrder = CosignedV2DutchOrder.parse(order.encodedOrder, chainId, PERMIT2ADDRESSES[chainId]);

  const decodedOrder: OpenDutchIntentV2 = {
    hash: order.orderHash,
    input: parsedOrder.info.input,
    outputs: parsedOrder.info.outputs,
    decayStartTime: order.cosignerData.decayStartTime,
    decayEndTime: order.cosignerData.decayEndTime,
    deadline: parsedOrder.info.deadline,
    swapper: parsedOrder.info.swapper,
    filler: order.cosignerData.exclusiveFiller,
    reactor: UNISWAP_REACTOR_ADDRESSES[chainId],
    chainId: order.chainId,
    orderStatus: order.orderStatus,
    type: OrderType.Dutch_V2,
    version: 2,
    createdAt: order.createdAt,
  };

  return decodedOrder;
};
