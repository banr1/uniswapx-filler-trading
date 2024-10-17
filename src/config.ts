import { ChainId } from './types/chain-id';
import { ContractAddress, IntentHash } from './types/hash';

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is not set');
} else if (!process.env.ALCHEMY_API_KEY) {
  throw new Error('ALCHEMY_API_KEY environment variable is not set');
}

interface Config {
  interval: number;
  chainId: ChainId;
  privateKey: string;
  alchemyUrl: string;
  targetInputTokenAddresses: ContractAddress[];
  targetOutputTokenAddresses: ContractAddress[];
  ignoreIntentHashes: IntentHash[];
}

export const config: Config = {
  interval: 200, // 200ms
  chainId: 42161, // Arbitrum
  privateKey: process.env.PRIVATE_KEY,
  alchemyUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  targetInputTokenAddresses: [
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    '0x912CE59144191C1204E64559FE8253a0e49E6548', // ARB
    '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // WBTC
    '0x5979D7b546E38E414F7E9822514be443A4800529', // wstETH
    '0x2C650dAb03A59332e2E0C0C4A7F726913e5028C1', // TAP
    '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', // PENDLE
    '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', // GMX
    '0x6985884C4392D348587B19cb9eAAf157F13271cd', // ZRO
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e
  ],
  targetOutputTokenAddresses: [
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
  ],
  // UniswapX on Arbitrum has a bug where the same intent is returned multiple times
  ignoreIntentHashes: [
    '0x50c78c7a580fd57f12107a7601f808c6cf5cda6faed8a2f44630c69378529db5',
    '0xf32a00c4b96a6f896bb7acf395c0a0402242f49c440b82cdfcf00e456607a2ff',
    '0x51741829a5ea7856144ec233801d4e976195cff69726e89af69816e4386e02a7',
    '0x88c468390604c87bd628694d790dbb3819a568cd182c897fbafa456fbb06ca9e',
    '0x0b9c3fa8185ec268478c7e1e709c80eb3b5afddc16f3c44959505b096ef41e95',
    '0xdf539c1f6d7e87436a8589f234df2126da69aea92aa91f1edb4ecdaec763a628',
    '0x01f69e9c45713b2e7815e12d176f1131e064a97bc4f3f694738b6699d4133bb5',
    '0x9642f0c692fa818eace55c154185da8a005c7cf57beedabe736513643d77d6d8',
    '0x8a7915b54247158516e7a4a831ea2bf2d1135c39ac11fa0aaa627da9ea6d170d',
  ],
};
