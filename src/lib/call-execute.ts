// lib/call-execute.ts

import { ethers } from 'ethers';
import { DutchIntentV2 } from '../types/dutch-intent-v2';
import { UNISWAP_REACTOR_ABI } from '../constants/uniswap-reactor-abi';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';

export const callExecute = async (intent: DutchIntentV2) => {
  console.log('Executing intent:', intent);

  const provider = new ethers.providers.JsonRpcProvider('https://rpc-mainnet.maticvigil.com');
  const contractAddress = UNISWAP_REACTOR_ADDRESSES[intent.chainId];
  const reactor = new ethers.Contract(contractAddress, UNISWAP_REACTOR_ABI, provider);

  // await reactor.execute();
  console.log('reactor:', reactor.address);
};
