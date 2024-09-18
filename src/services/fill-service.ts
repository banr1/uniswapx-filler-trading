// services/reactor-contract-service.ts

import { V2DutchOrderReactor } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { MockERC20 as ERC20 } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { logger } from '../logger';
import { getSupportedToken } from '../utils';
import { BigNumber, ContractReceipt, ethers, utils, Wallet } from 'ethers';
import { computePoolAddress, FeeAmount, Pool, Route, SwapQuoter, SwapRouter, Trade } from '@uniswap/v3-sdk';
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import { config } from '../config';
import JSBI from 'jsbi';
import { POOL_FACTORY_ADDRESS, QUOTER_CONTRACT_ADDRESS, SWAP_ROUTER_ADDRESS } from '../constants';
import { UniswapV3Pool__factory } from '../types/typechain';
import { Result } from 'ethers/lib/utils';

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
    const receipt = await tx.wait();
    logger.info('Filled the intent successfully 🎉');
    logger.info(`receipt: ${receipt}`);
    return receipt;
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
    if (outputToken === null) {
      logger.error('Failed to find the output token 🚨');
      return;
    }

    const tokenA = new Token(
      config.chainId,
      inputToken.address,
      await inputToken.decimals(),
      await inputToken.symbol(),
      await inputToken.name(),
    );
    const tokenB = new Token(
      config.chainId,
      outputToken.address,
      await outputToken.decimals(),
      await outputToken.symbol(),
      await outputToken.name(),
    );
    const poolAddress = computePoolAddress({
      factoryAddress: POOL_FACTORY_ADDRESS,
      tokenA,
      tokenB,
      fee: FeeAmount.MEDIUM,
    });
    const poolContract = UniswapV3Pool__factory.connect(poolAddress, this.provider);
    const [slot0, liquidity] = await Promise.all([poolContract.slot0(), poolContract.liquidity()]);
    const pool = new Pool(tokenA, tokenB, FeeAmount.MEDIUM, liquidity.toString(), slot0[0].toString(), slot0[1]);
    const swapRoute = new Route([pool], tokenA, tokenB);
    const amountOut = await this.getOutputQuote(swapRoute, tokenA, receivedInputTokenAmount);
    const uncheckedTrade = Trade.createUncheckedTrade({
      route: swapRoute,
      inputAmount: CurrencyAmount.fromRawAmount(tokenA, utils.formatUnits(receivedInputTokenAmount, tokenA.decimals)),
      outputAmount: CurrencyAmount.fromRawAmount(tokenB, JSBI.BigInt(amountOut)),
      tradeType: TradeType.EXACT_INPUT,
    });
    const methodParameters = SwapRouter.swapCallParameters(uncheckedTrade, {
      slippageTolerance: new Percent(50, 10000),
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      recipient: this.wallet.address,
    });
    const txToSend = {
      data: methodParameters.calldata,
      to: SWAP_ROUTER_ADDRESS,
      from: this.wallet.address,
      value: BigNumber.from(methodParameters.value),
      maxFeePerGas: 100000000000,
      maxPriorityFeePerGas: 1000000000,
    };
    const tx = await this.wallet.sendTransaction(txToSend);
    await tx.wait();
  }

  async getOutputQuote(route: Route<Token, Token>, tokenA: Token, amountIn: number): Promise<Result> {
    const { calldata } = await SwapQuoter.quoteCallParameters(
      route,
      CurrencyAmount.fromRawAmount(tokenA, utils.formatUnits(amountIn, tokenA.decimals).toString()),
      TradeType.EXACT_INPUT,
      {
        useQuoterV2: true,
      },
    );

    const quoteCallReturnData = await this.provider.call({
      to: QUOTER_CONTRACT_ADDRESS,
      data: calldata,
    });

    return utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData);
  }
}
