// lib/call-execute.ts

import { ethers } from 'ethers';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { V2DutchOrderReactor__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { SignedOrderStruct } from '@banr1/uniswapx-sdk/dist/src/contracts/V2DutchOrderReactor';
import { consola } from 'consola';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { config } from '../config';

export const callExecute = async (
  intentAndSignature: { intent: CosignedV2DutchOrder; signature: string },
  signer: ethers.Wallet,
) => {
  const reactorContractAddress = UNISWAP_REACTOR_ADDRESSES[config.chainId];
  const reactor = V2DutchOrderReactor__factory.connect(reactorContractAddress, signer);
  const { intent, signature } = intentAndSignature;
  const signedIntent: SignedOrderStruct = {
    order: intent.serialize(),
    sig: signature,
  };

  try {
    const tx = await reactor.execute(signedIntent, { gasLimit: 600_000 });
    const txReceipt = await tx.wait();
    return txReceipt;
  } catch (error) {
    consola.error('Error🚨 in calling execute:', error);
    throw error;
  }
};
