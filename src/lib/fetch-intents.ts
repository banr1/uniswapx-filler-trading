// lib/fetch-intents.ts

import { OrderType } from '@banr1/uniswapx-sdk';
import { config } from '../config';
import { FetchIntentsParams } from '../types/fetch-intents-params';
import { RawOpenDutchIntentV2 } from '../types/raw-dutch-intent-v2';
import axios from 'axios';

export async function fetchIntents(): Promise<RawOpenDutchIntentV2[]> {
  const params: FetchIntentsParams = {
    chainId: config.chainId,
    limit: 1,
    orderStatus: 'open',
    sortKey: 'createdAt',
    desc: true,
    sort: 'lt(9000000000)',
    orderType: OrderType.Dutch_V2,
    includeV2: true,
  };
  const response = await axios.get<{ orders: RawOpenDutchIntentV2[] }>(
    `${config.uniswapxApiBaseUrl}/orders`,
    { params },
  );
  return response.data.orders;
}
