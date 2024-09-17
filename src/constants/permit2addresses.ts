import { config } from '../config';
import { ChainId } from '../types/chain-id';
import { Address } from '../types/hash';

const PERMIT2ADDRESSES: Record<ChainId, Address> = {
  1: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  42161: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
};

export const PERMIT2ADDRESS = PERMIT2ADDRESSES[config.chainId];
