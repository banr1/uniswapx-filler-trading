import { UnsignedV2DutchOrder, UnsignedV2DutchOrderInfo } from '@uniswap/sdks/sdks/uniswapx-sdk/src/order/V2DutchOrder';
import { V2DutchOrderBuilder } from '@uniswap/sdks/sdks/uniswapx-sdk/src/builder/V2DutchOrderBuilder';
import { NonceManager } from '@uniswap/sdks/sdks/uniswapx-sdk/src/utils';
import { UNISWAP_REACTOR_ADDRESSES } from '../src/constants/uniswap-reactor-addresses';
import { ethers } from 'ethers';
import { PERMIT2ADDRESSES } from '../src/constants/permit2addresses';
import consola from 'consola';

// const COSIGNER_DATA_TUPLE_ABI = 'tuple(uint256,uint256,address,uint256,uint256,uint256[])';

// const V2_DUTCH_ORDER_ABI = [
//   'tuple(' +
//     [
//       'tuple(address,address,uint256,uint256,address,bytes)', // OrderInfo
//       'address', // cosigner
//       'tuple(address,uint256,uint256)', // input
//       'tuple(address,uint256,uint256,address)[]', // outputs
//       COSIGNER_DATA_TUPLE_ABI, // cosignerData
//       'bytes', // cosignature
//     ].join(',') +
//     ')',
// ];

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is not set');
  }

  const chainId = 42161;
  const swapper = '0xa7152Fad7467857dC2D4060FEcaAdf9f6B8227d3';
  const provider = new ethers.providers.JsonRpcProvider(
    'https://arb-mainnet.g.alchemy.com/v2/f5kl3xhwBkEw2ECT58X2yHGsrb6b-z4A',
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const nonceMgr = new NonceManager(provider, chainId, PERMIT2ADDRESSES[chainId]);
  const nonce = await nonceMgr.useNonce(swapper);

  const unsignedOrderInfo: UnsignedV2DutchOrderInfo = {
    reactor: UNISWAP_REACTOR_ADDRESSES[chainId],
    swapper,
    deadline: Math.floor(Date.now() / 1000) + 110,
    cosigner: signer.address,
    nonce,
    input: {
      token: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      startAmount: ethers.BigNumber.from('1000000000000000000'),
      endAmount: ethers.BigNumber.from('1000000000000000000'),
    },
    outputs: [
      {
        token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        startAmount: ethers.BigNumber.from('1000000000000000000'),
        endAmount: ethers.BigNumber.from('900000000000000000'),
        recipient: '0xa7152Fad7467857dC2D4060FEcaAdf9f6B8227d3',
      },
    ],
    additionalValidationContract: '',
    additionalValidationData: '0x',
  };

  const unsignedOrder = new UnsignedV2DutchOrder(unsignedOrderInfo, chainId, PERMIT2ADDRESSES[chainId]);
  const builder = V2DutchOrderBuilder.fromOrder(unsignedOrder);
  const signedOrder = builder.build();

  consola.info('Signed order: ', signedOrder);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
