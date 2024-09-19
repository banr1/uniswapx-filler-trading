// services/reactor-contract-service.ts

import { V2DutchOrderReactor } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { MockERC20 as ERC20 } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { logger } from '../logger';
import { getSupportedToken } from '../utils';
import { BigNumber, ContractReceipt, ethers, utils, Wallet } from 'ethers';
import {
  computePoolAddress,
  FeeAmount,
  Pool,
  Route,
  SwapRouter,
  Trade,
} from '@uniswap/v3-sdk';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { config } from '../config';
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

  constructor({
    wallet,
    reactor,
    inputTokens,
    outputTokens,
  }: FillServiceConstructorArgs) {
    this.wallet = wallet;
    this.provider = wallet.provider;
    this.reactor = reactor;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
  }

  // Fill the intent and swap the input token back to the original token
  async fillIntent({
    intent,
    signature,
  }: {
    intent: CosignedV2DutchOrder;
    signature: string;
  }): Promise<void> {
    let txReceipt: ContractReceipt;
    try {
      txReceipt = await this.executeFill(intent, signature);
    } catch (error) {
      logger.error(`Failed to fill the intent 🚨: ${error}`);
      throw error;
    }
    try {
      await this.swapInputTokenBackToOriginalToken(intent, txReceipt);
    } catch (error) {
      logger.error(
        `Failed to swap the input token back to the original token 🚨: ${error}`,
      );
      throw error;
    }
  }

  // Execute the fill intent transaction
  private async executeFill(
    intent: CosignedV2DutchOrder,
    signature: string,
  ): Promise<ContractReceipt> {
    const signedIntent = {
      order: intent.serialize(),
      sig: signature,
    };
    const gasLimit = 600_000;
    logger.info('Starting to fill the intent 🦄');
    const tx = await this.reactor.execute(signedIntent, { gasLimit });
    const receipt = await tx.wait();
    logger.info('Filled the intent successfully 🎉');
    logger.info(`receipt: ${receipt}`);
    return receipt;
  }

  // Swap the input token back to the original token to prepare for the next fill
  private async swapInputTokenBackToOriginalToken(
    intent: CosignedV2DutchOrder,
    txReceipt: ContractReceipt,
  ): Promise<void> {
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
    const receivedInputTokenAmount = Number(inputTokenTransferEvent.data);

    const inputTokenErc20 = getSupportedToken(
      intent.info.input,
      this.inputTokens,
    );
    if (inputTokenErc20 === null) {
      logger.error('Failed to find the input token 🚨');
      return;
    }
    const outputTokenErc20 = getSupportedToken(
      intent.info.outputs[0]!,
      this.outputTokens,
    );
    if (outputTokenErc20 === null) {
      logger.error('Failed to find the output token 🚨');
      return;
    }

    const inputToken = new Token(
      config.chainId,
      inputTokenErc20.address,
      await inputTokenErc20.decimals(),
      await inputTokenErc20.symbol(),
      await inputTokenErc20.name(),
    );
    const originalToken = new Token(
      config.chainId,
      outputTokenErc20.address,
      await outputTokenErc20.decimals(),
      await outputTokenErc20.symbol(),
      await outputTokenErc20.name(),
    );
    const poolAddress = computePoolAddress({
      factoryAddress: POOL_FACTORY_ADDRESS,
      tokenA: inputToken,
      tokenB: originalToken,
      fee: FeeAmount.MEDIUM,
    });
    const poolContract = UniswapV3Pool__factory.connect(
      poolAddress,
      this.provider,
    );
    const [slot0, liquidity] = await Promise.all([
      poolContract.slot0(),
      poolContract.liquidity(),
    ]);
    const pool = new Pool(
      inputToken,
      originalToken,
      FeeAmount.MEDIUM,
      liquidity.toString(),
      slot0[0].toString(),
      slot0[1],
    );
    const swapRoute = new Route([pool], inputToken, originalToken);
    // const amountOut = await this.getOutputQuote(swapRoute, inputToken, receivedInputTokenAmount);
    const trade = await Trade.exactIn(
      swapRoute,
      CurrencyAmount.fromRawAmount(
        inputToken,
        utils.formatUnits(receivedInputTokenAmount, inputToken.decimals),
      ),
    );
    const methodParameters = SwapRouter.swapCallParameters(trade, {
      slippageTolerance: new Percent(50, 10000),
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      recipient: this.wallet.address,
    });
    const txToSend = {
      data: methodParameters.calldata,
      to: SWAP_ROUTER_ADDRESS,
      from: this.wallet.address,
      value: BigNumber.from(methodParameters.value),
      maxFeePerGas: 100_000_000_000,
      maxPriorityFeePerGas: 100_000_000_000,
    };
    const tx = await this.wallet.sendTransaction(txToSend);
    const receipt = await tx.wait();
    logger.info(
      'Swapped the input token back to the original token successfully 🎉',
    );
    logger.info(`receipt: ${receipt}`);
  }

  // private async getOutputQuote(route: Route<Token, Token>, tokenIn: Token, amountIn: number): Promise<Result> {
  //   const { calldata } = await SwapQuoter.quoteCallParameters(
  //     route,
  //     CurrencyAmount.fromRawAmount(tokenIn, utils.formatUnits(amountIn, tokenIn.decimals)),
  //     TradeType.EXACT_INPUT,
  //     {
  //       useQuoterV2: true,
  //     },
  //   );

  //   const quoteCallReturnData = await this.provider.call({
  //     to: QUOTER_CONTRACT_ADDRESS,
  //     data: calldata,
  //   });

  //   return utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData);
  // }
}
