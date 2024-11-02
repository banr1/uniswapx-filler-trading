// utils.ts

import { DutchInput, DutchOutput } from '@banr1/uniswapx-sdk';
import { BigNumber, utils } from 'ethers';
import { Address } from './types/hash';
import Decimal from 'decimal.js';
import { formatUnits } from 'ethers/lib/utils';
import { ERC20State } from './erc20-state';

export function nowTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function getTargetToken(
  intentToken: DutchInput | DutchOutput,
  targetTokens: ERC20State[],
): ERC20State | null {
  return (
    targetTokens.find(
      targetToken => targetToken.address === intentToken.token,
    ) || null
  );
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function topicToAddress(topic: string): Address {
  return utils.defaultAbiCoder.decode(['address'], topic)[0];
}

export function bigNumberToDecimal(num: BigNumber, decimals: number): Decimal {
  return new Decimal(formatUnits(num, decimals));
}
