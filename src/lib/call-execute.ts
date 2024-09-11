// lib/call-execute.ts

import { ethers } from 'ethers';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { V2DutchOrderReactor__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { SignedOrderStruct } from '@banr1/uniswapx-sdk/dist/src/contracts/ExclusiveDutchOrderReactor';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { consola } from 'consola';
import { ChainId } from '../types/chain-id';

export const buildAndSignIntent = async (
  intent: CosignedV2DutchOrder,
  signer: ethers.Wallet,
): Promise<SignedOrderStruct> => {
  const { domain, types, values } = intent.permitData();
  const sig = await signer._signTypedData(domain, types, values);

  const serializedIntent = intent.serialize();

  return {
    order: serializedIntent,
    sig,
  };
};

export const callExecute = async (intent: CosignedV2DutchOrder, signer: ethers.Wallet, chainId: ChainId) => {
  const reactorContractAddress = UNISWAP_REACTOR_ADDRESSES[chainId];
  const reactor = V2DutchOrderReactor__factory.connect(reactorContractAddress, signer);

  const signedIntent = await buildAndSignIntent(intent, signer);

  try {
    const tx = await reactor.execute(signedIntent, { gasLimit: 600_000 });
    const txReceipt = await tx.wait();
    return txReceipt;
  } catch (error) {
    consola.error('Error🚨 in calling execute:', error);
    throw error;
  }
};
