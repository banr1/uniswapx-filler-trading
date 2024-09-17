// utils.ts

import { DutchInput, DutchOutput } from '@banr1/uniswapx-sdk';
import { MockERC20 as ERC20 } from '@banr1/uniswapx-sdk/dist/src/contracts';

export function nowTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function getSupportedToken(intentToken: DutchInput | DutchOutput, supportedTokens: ERC20[]): ERC20 | null {
  return supportedTokens.find(supportedToken => supportedToken.address === intentToken.token) || null;
}
