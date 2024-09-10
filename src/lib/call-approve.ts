// lib/call-approval.ts

import { MockERC20__factory } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { ethers } from 'ethers';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import consola from 'consola';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { ChainId } from '../types/chain-id';

export const callApprove = async (intent: CosignedV2DutchOrder, signer: ethers.Wallet, chainId: ChainId) => {
  const outputTokenAddress = intent.info.outputs[0]!.token;
  const outputToken = MockERC20__factory.connect(outputTokenAddress, signer);

  const reactorContractAddress = UNISWAP_REACTOR_ADDRESSES[chainId];

  try {
    const tx = await outputToken.approve(reactorContractAddress, ethers.constants.MaxUint256);
    const txReceipt = await tx.wait();

    return txReceipt;
  } catch (error) {
    consola.error('Error🚨 in approving token:', error);
    throw error;
  }
};
