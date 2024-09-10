import { UNISWAP_REACTOR_ADDRESSES } from '../src/constants/uniswap-reactor-addresses';
import { BigNumber, ethers } from 'ethers';
import { PERMIT2ADDRESSES } from '../src/constants/permit2addresses';
import consola from 'consola';
import {
  CosignedV2DutchOrder,
  CosignerData,
  NonceManager,
  UnsignedV2DutchOrder,
  UnsignedV2DutchOrderInfo,
} from '@banr1/uniswapx-sdk';

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is not set');
  }

  const chainId = 42161;
  const swapper = '0xa7152Fad7467857dC2D4060FEcaAdf9f6B8227d3';
  const provider = new ethers.providers.JsonRpcProvider(
    'https://arb-mainnet.g.alchemy.com/v2/f5kl3xhwBkEw2ECT58X2yHGsrb6b-z4A',
  );
  const cosigner = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const nonceMgr = new NonceManager(provider, chainId, PERMIT2ADDRESSES[chainId]);
  const nonce = await nonceMgr.useNonce(swapper);
  const deadline = Math.floor(Date.now() / 1000) + 100;

  const unsignedOrderInfo: UnsignedV2DutchOrderInfo = {
    reactor: UNISWAP_REACTOR_ADDRESSES[chainId],
    swapper,
    deadline,
    cosigner: cosigner.address,
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
        recipient: swapper,
      },
    ],
    additionalValidationContract: ethers.constants.AddressZero,
    additionalValidationData: '0x',
  };

  const cosignerData: CosignerData = {
    decayStartTime: deadline - 100,
    decayEndTime: deadline,
    exclusiveFiller: '0x0000000000000000000000000000000000000000',
    exclusivityOverrideBps: BigNumber.from(0),
    inputOverride: BigNumber.from(0),
    outputOverrides: [ethers.BigNumber.from('1000000000000000000')],
  };

  const unsignedOrder = new UnsignedV2DutchOrder(unsignedOrderInfo, chainId, PERMIT2ADDRESSES[chainId]);
  const fullOrderHash = unsignedOrder.cosignatureHash(cosignerData);
  const cosignature = await cosigner.signMessage(fullOrderHash);
  const signedOrder = CosignedV2DutchOrder.fromUnsignedOrder(unsignedOrder, cosignerData, cosignature);
  consola.info('Signed order: ', signedOrder);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('An error occurred:');
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  });
