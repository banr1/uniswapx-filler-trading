// lib/call-approval.ts

import { MockERC20__factory } from '@uniswap/uniswapx-sdk/dist/src/contracts';
import { OpenDutchIntentV2 } from '../types/dutch-intent-v2';
import { ethers } from 'ethers';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import consola from 'consola';

export const callApprove = async (intent: OpenDutchIntentV2, signer: ethers.Wallet) => {
  const outputTokenAddress = intent.outputs[0]!.token;
  const outputToken = MockERC20__factory.connect(outputTokenAddress, signer);

  const reactorContractAddress = UNISWAP_REACTOR_ADDRESSES[intent.chainId];

  try {
    const tx = await outputToken.approve(reactorContractAddress, ethers.constants.MaxUint256);
    const txReceipt = await tx.wait();

    return txReceipt;
  } catch (error) {
    consola.error('Error approving token:', error);
    throw error;
  }
};
