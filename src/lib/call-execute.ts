// lib/call-execute.ts

import { ethers } from 'ethers';
import { OpenDutchIntentV2 } from '../types/dutch-intent-v2';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { V2DutchOrderReactor__factory } from '@uniswap/uniswapx-sdk/dist/src/contracts';
import { SignedOrderStruct } from '@uniswap/uniswapx-sdk/dist/src/contracts/ExclusiveDutchOrderReactor';
import { DutchOrderBuilder, NonceManager } from '@uniswap/uniswapx-sdk';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';
import { consola } from 'consola';

export const buildAndSignIntent = async (
  intent: OpenDutchIntentV2,
  signer: ethers.Wallet,
  provider: ethers.providers.JsonRpcProvider,
): Promise<SignedOrderStruct> => {
  const chainId = intent.chainId;
  const nonceMgr = new NonceManager(provider, chainId, PERMIT2ADDRESSES[chainId]);
  const nonce = await nonceMgr.useNonce(intent.swapper);

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
  const sig = signer._signTypedData(domain, types, values);

  const serializedOrder = order.serialize();

  return {
    order: serializedOrder,
    sig,
  };
};

export const callExecute = async (
  intent: OpenDutchIntentV2,
  signer: ethers.Wallet,
  provider: ethers.providers.JsonRpcProvider,
) => {
  const reactorContractAddress = UNISWAP_REACTOR_ADDRESSES[intent.chainId];
  const reactor = V2DutchOrderReactor__factory.connect(reactorContractAddress, signer);

  const signedIntent = await buildAndSignIntent(intent, signer, provider);

  try {
    const tx = await reactor.execute(signedIntent, { gasLimit: 50_000_000 }); // 0.5 Gwei
    const txReceipt = await tx.wait();
    return txReceipt;
  } catch (error) {
    consola.error('Error🚨 in calling execute:', error);
    throw error;
  }
};
