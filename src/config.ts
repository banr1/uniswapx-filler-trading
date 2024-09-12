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
  alchemyApiKey: string;
} = {
  interval: 3500,
  chainId: 42161,
  privateKey: process.env.PRIVATE_KEY,
  alchemyApiKey: process.env.ALCHEMY_API_KEY,
};
