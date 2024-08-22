// lib/fetch-orders.ts

import { OrderType } from '@uniswap/uniswapx-sdk';
import axios from 'axios';

import { UNISWAPX_API_ENDPOINT } from '@/constants/api-endpoint';
import { UNISWAP_REACTOR_ADDRESSES } from '@/constants/uniswap-reactor-addresses';
import { ChainId } from '@/types/chain-id';
import { DutchIntentV2, FilledDutchIntentV2, OpenDutchIntentV2, RawDutchIntentV2 } from '@/types/dutch-intent-v2';
import { FetchOrdersParams } from '@/types/fetch-orders-params';

export async function fetchIntents(params: FetchOrdersParams): Promise<DutchIntentV2[]> {
  let intents;
  if (params.orderType === OrderType.Dutch_V2) {
    const res = await axios.get<{ orders: RawDutchIntentV2[] }>(UNISWAPX_API_ENDPOINT, { params });
    intents = res.data.orders
      .map(order => decodeOrderV2(order, params.chainId))
      .filter((order): order is DutchIntentV2 => order !== null);
  } else {
    throw new Error('Invalid order type');
  }

  return intents;
}

const decodeOrderV2 = (order: RawDutchIntentV2, chainId: ChainId): DutchIntentV2 => {
  if (!['open', 'filled'].includes(order.orderStatus)) {
    throw new Error('Invalid order status');
  }

  // const parsedOrder = DutchOrder.parse(order.encodedOrder, chainId);

  const decodedOrder = {
    hash: order.orderHash,
    input: order.input,
    outputs: order.outputs,
    decayStartTime: order.cosignerData.decayStartTime,
    decayEndTime: order.cosignerData.decayEndTime,
    swapper: order.swapper,
    filler: order.cosignerData.exclusiveFiller,
    reactor: UNISWAP_REACTOR_ADDRESSES[chainId],
    chainId: order.chainId,
    txHash: order.orderStatus === 'filled' ? order.txHash : null,
    orderStatus: order.orderStatus,
    type: OrderType.Dutch_V2,
    version: 2,
    createdAt: order.createdAt,
  };
  if (order.orderStatus === 'filled') {
    return decodedOrder as FilledDutchIntentV2;
  } else {
    return decodedOrder as OpenDutchIntentV2;
  }
};
