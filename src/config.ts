import { ChainId } from './types/chain-id';

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is not set');
} else if (!process.env.ALCHEMY_API_KEY) {
  throw new Error('ALCHEMY_API_KEY environment variable is not set');
}

export const config: {
  interval: number;
  chainId: ChainId;
  privateKey: string;
  alchemyUrl: string;
} = {
  interval: 3200,
  chainId: 42161,
  privateKey: process.env.PRIVATE_KEY,
  alchemyUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
};
