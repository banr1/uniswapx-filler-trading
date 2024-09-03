// lib/call-execute.ts

import { BigNumber, ethers } from 'ethers';
import { OpenDutchIntentV2 } from '../types/dutch-intent-v2';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { MockERC20__factory, V2DutchOrderReactor__factory } from '@uniswap/uniswapx-sdk/dist/src/contracts';
import { SignedOrderStruct } from '@uniswap/uniswapx-sdk/dist/src/contracts/ExclusiveDutchOrderReactor';
import { DutchOrderBuilder, NonceManager } from '@uniswap/uniswapx-sdk';
import { ChainId } from '../types/chain-id';
import { PERMIT2ADDRESSES } from '../constants/permit2addresses';
import { consola } from 'consola';

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
  const outputTokenAddress = intent.outputs[0]!.token;
  const outputToken = MockERC20__factory.connect(outputTokenAddress, signer);

  const reactorContractAddress = UNISWAP_REACTOR_ADDRESSES[intent.chainId];
  const reactor = V2DutchOrderReactor__factory.connect(reactorContractAddress, signer);
  const nonceMgr = new NonceManager(provider, chainId, PERMIT2ADDRESSES[chainId]);
  const nonce = await nonceMgr.useNonce(intent.swapper);

  const signedIntent = buildAndSignIntent(intent, signer, nonce, chainId);

  try {
    const tx1 = await outputToken.approve(reactorContractAddress, ethers.constants.MaxUint256);
    const txReceipt1 = await tx1.wait();
    consola.info('Output token approval tx receipt:', txReceipt1);

    const tx2 = await reactor.execute(signedIntent, { gasLimit: 50_000_000 });
    const txReceipt2 = await tx2.wait();
    consola.info('Execution tx receipt:', txReceipt2);
    return txReceipt2;
  } catch (error) {
    consola.error('Error in calling txs:', error);
    throw error;
  }
};
