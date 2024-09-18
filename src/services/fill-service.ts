// services/reactor-contract-service.ts

import { V2DutchOrderReactor } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { MockERC20 as ERC20 } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { logger } from '../logger';
import { getSupportedToken } from '../utils';
import { ContractReceipt, ethers, utils, Wallet } from 'ethers';
import { computePoolAddress, FeeAmount, Pool, Route, SwapRouter, Trade } from '@uniswap/v3-sdk';
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import { config } from '../config';
import JSBI from 'jsbi';
import { POOL_FACTORY_ADDRESS, SWAP_ROUTER_ADDRESS } from '../constants';
import { UniswapV3Pool__factory } from '../types/typechain';

interface FillServiceConstructorArgs {
  wallet: Wallet;
  reactor: V2DutchOrderReactor;
  inputTokens: ERC20[];
  outputTokens: ERC20[];
}

export class FillService {
  private wallet: Wallet;
  private provider: ethers.providers.Provider;
  private reactor: V2DutchOrderReactor;
  private inputTokens: ERC20[];
  private outputTokens: ERC20[];

  constructor({ wallet, reactor, inputTokens, outputTokens }: FillServiceConstructorArgs) {
    this.wallet = wallet;
    this.provider = wallet.provider;
    this.reactor = reactor;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
  }

  async fillIntent({ intent, signature }: { intent: CosignedV2DutchOrder; signature: string }): Promise<void> {
    let txReceipt: ContractReceipt;
    try {
      txReceipt = await this.executeFill(intent, signature);
    } catch (error) {
      logger.error(`Failed to fill the intent 🚨: ${error}`);
      throw error;
    }
    try {
      await this.takeBackOutputToken(intent, txReceipt);
    } catch (error) {
      logger.error(`Failed to take back the output token 🚨: ${error}`);
      throw error;
    }
  }

  private async executeFill(intent: CosignedV2DutchOrder, signature: string): Promise<ContractReceipt> {
    const signedIntent = {
      order: intent.serialize(),
      sig: signature,
    };
    const gasLimit = 600_000;
    logger.info('Starting to fill the intent 🦄');
    const tx = await this.reactor.execute(signedIntent, { gasLimit });
    const txReceipt = await tx.wait();
    logger.info(`Filled the intent successfully 🎉`);
    logger.info(`txReceipt: ${txReceipt}`);
    return txReceipt;
  }

  private async takeBackOutputToken(intent: CosignedV2DutchOrder, txReceipt: ContractReceipt): Promise<void> {
    const inputTokenTransferEvent = txReceipt.events!.find(
      event =>
        event.event === 'Transfer' &&
        event.topics[1] === intent.info.swapper &&
        event.topics[2] === this.wallet.address,
    );
    if (inputTokenTransferEvent === undefined) {
      logger.error('Failed to find the transfer event for the input token 🚨');
      return;
    }
    // get the data value from the event
    const receivedInputTokenAmount = Number(inputTokenTransferEvent.data);

    const inputToken = getSupportedToken(intent.info.input, this.inputTokens);
    if (inputToken === null) {
      logger.error('Failed to find the input token 🚨');
      return;
    }
    const outputToken = getSupportedToken(intent.info.outputs[0]!, this.outputTokens);
  }
}
