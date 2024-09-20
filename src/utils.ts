// utils.ts

import { DutchInput, DutchOutput } from '@banr1/uniswapx-sdk';
import { ERC20 } from './types/typechain';

export function nowTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function getTargetToken(
  intentToken: DutchInput | DutchOutput,
  targetTokens: ERC20[],
): ERC20 | null {
  return (
    targetTokens.find(
      targetToken => targetToken.address === intentToken.token,
    ) || null
  );
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
