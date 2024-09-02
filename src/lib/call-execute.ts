// lib/call-execute.ts

import { BigNumber, ethers } from 'ethers';
import { OpenDutchIntentV2 } from '../types/dutch-intent-v2';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { V2DutchOrderReactor__factory } from '@uniswap/uniswapx-sdk/dist/src/contracts';
import { SignedOrderStruct } from '@uniswap/uniswapx-sdk/dist/src/contracts/ExclusiveDutchOrderReactor';
import { DutchOrderBuilder, NonceManager } from '@uniswap/uniswapx-sdk';
import { ChainId } from '../types/chain-id';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';

export const buildAndSignIntent = (
  intent: OpenDutchIntentV2,
  wallet: ethers.Wallet,
  nonce: BigNumber,
  chainId: ChainId,
): SignedOrderStruct => {
  const builder = new DutchOrderBuilder(chainId, UNISWAP_REACTOR_ADDRESSES[chainId], PERMIT2ADDRESSES[chainId]);

  const order = builder
    .deadline(intent.deadline)
    .decayEndTime(intent.decayEndTime)
    .decayStartTime(intent.decayStartTime)
    .nonce(nonce)
    .swapper(intent.swapper)
    .input(intent.input)
    .output(intent.outputs[0]!)
    .build();

  const { domain, types, values } = order.permitData();
  const signature = wallet._signTypedData(domain, types, values);

  const serializedOrder = order.serialize();

  return {
    order: serializedOrder,
    sig: signature,
  };
};

export const callExecute = async (intent: OpenDutchIntentV2, chainId: ChainId) => {
  const provider = new ethers.providers.JsonRpcProvider(
    'https://arb-mainnet.g.alchemy.com/v2/f5kl3xhwBkEw2ECT58X2yHGsrb6b-z4A',
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
  const contractAddress = UNISWAP_REACTOR_ADDRESSES[intent.chainId];
  const reactor = V2DutchOrderReactor__factory.connect(contractAddress, signer);
  const nonceMgr = new NonceManager(provider, chainId, PERMIT2ADDRESSES[chainId]);
  const nonce = await nonceMgr.useNonce(intent.swapper);

  const signedIntent = buildAndSignIntent(intent, signer, nonce, chainId);

  try {
    const tx = await reactor.execute(signedIntent, { gasLimit: 10000000 });
    const txReceipt = await tx.wait();
    console.log('txReceipt', txReceipt);
    return txReceipt;
  } catch (error) {
    console.error('Error in callExecute:', error);
    throw error;
  }
};
