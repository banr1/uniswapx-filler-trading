// lib/call-execute.ts

import { BigNumber, ethers } from 'ethers';
import { OpenDutchIntentV2 } from '../types/dutch-intent-v2';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { V2DutchOrderReactor__factory } from '@uniswap/uniswapx-sdk/dist/src/contracts';
import { SignedOrderStruct } from '@uniswap/uniswapx-sdk/dist/src/contracts/ExclusiveDutchOrderReactor';
import { DutchOrderBuilder, NonceManager } from '@uniswap/uniswapx-sdk';
import { ChainId } from '../types/chain-id';
import { Address } from '../types/hash';

export const buildAndSignIntent = (
  intent: OpenDutchIntentV2,
  wallet: ethers.Wallet,
  nonce: BigNumber,
  chainId: ChainId,
  reactorAddress: Address,
  permit2Address: Address,
): SignedOrderStruct => {
  const builder = new DutchOrderBuilder(chainId, reactorAddress, permit2Address);

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

export const callExecute = async (intent: OpenDutchIntentV2, chainId: ChainId, permit2Address: Address) => {
  const provider = new ethers.providers.JsonRpcProvider(
    'https://arb-mainnet.g.alchemy.com/v2/f5kl3xhwBkEw2ECT58X2yHGsrb6b-z4A',
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
  const contractAddress = UNISWAP_REACTOR_ADDRESSES[intent.chainId];
  const reactor = V2DutchOrderReactor__factory.connect(contractAddress, signer);
  const nonceMgr = new NonceManager(provider, chainId, permit2Address);
  const nonce = await nonceMgr.useNonce(intent.swapper);

  const signedIntent = buildAndSignIntent(intent, signer, nonce, chainId, contractAddress, permit2Address);

  const tx = await reactor.execute(signedIntent, { gasLimit: 5000000 });
  const txReceipt = await tx.wait();

  console.log('txReceipt', txReceipt);

  return txReceipt;
};
