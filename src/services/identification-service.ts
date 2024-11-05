// services/identification-service.ts

import { CosignedV2DutchOrder, OrderType } from '@banr1/uniswapx-sdk';
import axios from 'axios';
import { BigNumber } from 'ethers';
import {
  bigNumberToDecimal,
  decimalToShow,
  getTargetToken,
  nowTimestamp,
} from '../utils';
import { logger } from '../logger';
import { PERMIT2_ADDRESS } from '../constants';
import { IntentWithSignature } from '../types/intent-with-signature';
import { IntentHash } from '../types/hash';
import { config } from '../config';
import Decimal from 'decimal.js';
import { ERC20State } from '../erc20-state';
import { sendTelegramMessage } from '../lib/send-telegram-message';
import { fetchIntents } from '../lib/fetch-intents';

interface IdentificationServiceConstructorArgs {
  inTokens: ERC20State[];
  outTokens: ERC20State[];
}

// IdentificationService class
// This class is responsible for identifying suitable intents
// It fetches intents from the Uniswap API and filters them
// based on the input and output tokens, and the current time
export class IdentificationService {
  private inTokens: ERC20State[];
  private outTokens: ERC20State[];
  private lastSkippedIntentHash: IntentHash | null = null;

  constructor({ inTokens, outTokens }: IdentificationServiceConstructorArgs) {
    this.inTokens = inTokens;
    this.outTokens = outTokens;
  }

  // Fetch intents from the Uniswap API and identify suitable intents
  async identifyIntent(): Promise<IntentWithSignature | null> {
    try {
      return await this._identifyIntent();
    } catch (error) {
      logger.error(`Error occurred while identifying intent: ${error}`);
      throw error;
    }
  }

  private async _identifyIntent(): Promise<IntentWithSignature | null> {
    // Fetch an intent that is open, Dutch V2, and latest
    const rawIntents = await fetchIntents();
    if (rawIntents.length === 0) {
      if (new Date().getSeconds() === 0) {
        logger.info('No intents found 🍪');
        this.lastSkippedIntentHash = null;
      }
    }

    const rawIntent = rawIntents[0]!;
    // If the intent is in the ignore list, skip it
    if (config.ignoreIntentHashes.includes(rawIntent.orderHash)) {
      // log only when seconds is 0
      if (new Date().getSeconds() === 0) {
        logger.info('The intent is in the ignore list. Skip it 🥿');
      }
      return null;
    }

    // If the same intent is found again, skip it
    if (this.lastSkippedIntentHash === rawIntent.orderHash) {
      logger.info(
        `The same intent found again. Skip it 🦋: ${rawIntent.orderHash}`,
      );
      return null;
    }

    if (
      rawIntent.type !== OrderType.Dutch_V2 ||
      rawIntent.orderStatus !== 'open'
    ) {
      logger.info('An intent found!✨ But it is not a Dutch V2 open intent.');
      this.lastSkippedIntentHash = rawIntent.orderHash;
      return null;
    }

    const intent = CosignedV2DutchOrder.parse(
      rawIntent.encodedOrder,
      config.chainId,
      PERMIT2_ADDRESS,
    );

    if (!intent.info.outputs[0]) {
      logger.info('An intent found!✨ But it has no output token.');
      this.lastSkippedIntentHash = rawIntent.orderHash;
      return null;
    }

    const intentInToken = getTargetToken(intent.info.input, this.inTokens);
    if (!intentInToken) {
      logger.info('An intent found!✨ But input token is not targeted');
      this.lastSkippedIntentHash = rawIntent.orderHash;
      return null;
    }
    const intentOutToken = getTargetToken(
      intent.info.outputs[0],
      this.outTokens,
    );
    if (!intentOutToken) {
      logger.info('An intent found!✨ But output token is not targeted');
      this.lastSkippedIntentHash = rawIntent.orderHash;
      return null;
    }

    const inName = intentInToken.symbol;
    const outName = intentOutToken.symbol;
    const pair = `${inName}/${outName}`;
    const inBinanceName =
      inName === 'WETH' ? 'ETH' : inName === 'WBTC' ? 'BTC' : inName;
    const outBinanceName =
      outName === 'WETH' ? 'ETH' : outName === 'WBTC' ? 'BTC' : outName;
    const binancePair = `${inBinanceName}${outBinanceName}`;
    const res = await axios.get(
      `https://api.binance.us/api/v3/depth?symbol=${binancePair}&limit=1`,
    );
    const sellingBinancePrice = new Decimal(res.data.bids[0][0]);
    logger.info(`Selling binance price: ${sellingBinancePrice} ${binancePair}`);

    const endTime = intent.info.cosignerData.decayEndTime;
    const deadline = intent.info.deadline;
    if (endTime < nowTimestamp() || deadline < nowTimestamp()) {
      logger.info(
        `An intent found!✨ But it is expired: ${new Date(endTime * 1000).toTimeString()}`,
      );
      this.lastSkippedIntentHash = rawIntent.orderHash;
      return null;
    }

    const resolutionTiming = nowTimestamp();
    const resolution = intent.resolve({ timestamp: resolutionTiming });
    const resolvedInAmount = bigNumberToDecimal(
      resolution.input.amount,
      intentInToken.decimals,
    );
    const resolvedOutAmount = bigNumberToDecimal(
      resolution.outputs
        .map(output => output.amount)
        .reduce((a, b) => a.add(b), BigNumber.from(0)),
      intentOutToken.decimals,
    );

    // It's like an 'actual price' because the price is calculated based on only the output amount of the filler
    const buyingPrice = resolvedOutAmount.div(resolvedInAmount);
    logger.info(
      `Buying price: ${buyingPrice.toString()} ${pair} (resolution timing: ${new Date(resolutionTiming * 1000).toTimeString()})`,
    );

    if (buyingPrice.gt(sellingBinancePrice)) {
      logger.info(
        `An intent found!✨ But the price is not good (buying price: ${buyingPrice.toString()}, selling binance price: ${sellingBinancePrice})`,
      );
      return null;
    }

    const outBalance = intentOutToken.balance;

    const buyingPriceToShow = decimalToShow(buyingPrice, 6);
    const sellingBinancePriceToShow = decimalToShow(sellingBinancePrice, 6);
    const resolvedOutAmountToShow = decimalToShow(resolvedOutAmount, 6);
    const outBalanceToShow = decimalToShow(outBalance, 6);

    if (outBalance.lt(resolvedOutAmount)) {
      logger.info(
        `An intent found!✨ But balance is not enough (resolved amount: ${resolvedOutAmountToShow.toString()} ${outName} balance: ${outBalanceToShow} ${outName})`,
      );
      sendTelegramMessage(
        `An intent found!✨\n` +
          `- Buying price: ${buyingPriceToShow.toString()} ${pair}\n` +
          `- Selling binance price: ${sellingBinancePriceToShow} ${inBinanceName}/${outBinanceName}\n\n` +
          `But the balance is not enough to fill the intent.\n` +
          `- Necessary balance: ${resolvedOutAmountToShow.toString()} ${outName}\n` +
          `- Current balance: ${outBalanceToShow} ${outName}`,
      );
      this.lastSkippedIntentHash = rawIntent.orderHash;
      return null;
    }

    sendTelegramMessage(
      `An intent found!✨\n` +
        `- Buying price: ${buyingPriceToShow.toString()} ${pair}\n` +
        `- Selling binance price: ${sellingBinancePriceToShow} ${inBinanceName}/${outBinanceName}\n\n` +
        `And the balance is enough to fill the intent.\n` +
        `- Necessary balance: ${resolvedOutAmountToShow.toString()} ${outName}\n` +
        `- Current balance: ${outBalanceToShow} ${outName}\n\n` +
        `So let's fill the intent!`,
    );

    logger.info('An suitable intent found!✨');
    logger.info(`intent: ${JSON.stringify(intent)}`);

    return {
      intent,
      signature: rawIntent.signature,
    };
  }
}
