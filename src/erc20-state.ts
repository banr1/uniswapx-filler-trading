// types/erc20-state.ts

import Decimal from 'decimal.js';
import { Address } from './types/hash';

export interface ERC20State {
  address: Address;
  symbol: string;
  balance: Decimal;
  decimals: number;
}
