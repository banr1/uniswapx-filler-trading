// services/reactor-contract-service.ts

import { V2DutchOrderReactor } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { logger } from '../logger';
import { ContractReceipt } from 'ethers';
import { IntentWithSignature } from '../types/intent-with-signature';
import { SignedOrderStruct } from '@banr1/uniswapx-sdk/dist/src/contracts/V2DutchOrderReactor';
import { sendTelegramMessage } from '../lib/send-telegram-message';

interface FillServiceConstructorArgs {
  reactor: V2DutchOrderReactor;
}

// FillService class
// This class is responsible for filling intents
// It executes the fill intent transaction and swaps the input token back to the original token
export class FillService {
  private reactor: V2DutchOrderReactor;

  constructor({ reactor }: FillServiceConstructorArgs) {
    this.reactor = reactor;
  }

  // Fill the intent and swap the input token back to the original token
  async fillIntent({ intent, signature }: IntentWithSignature): Promise<void> {
    // let txReceipt: ContractReceipt;
    try {
      await this.executeFill(intent, signature);
    } catch (error) {
      logger.error(`Error occurred while filling the intent 🚨: ${error}`);
      sendTelegramMessage('The intent fill was not successful 🚨');
      throw error;
    }
  }

  // Execute the fill intent transaction
  private async executeFill(
    intent: CosignedV2DutchOrder,
    signature: string,
  ): Promise<ContractReceipt> {
    const signedIntent: SignedOrderStruct = {
      order: intent.serialize(),
      sig: signature,
    };
    const gasLimit = 900_000;
    logger.info('Starting to fill the intent 🦄');
    const tx = await this.reactor.execute(signedIntent, { gasLimit });
    const receipt = await tx.wait();
    logger.info('The intent fill was successfully executed 🎉');
    sendTelegramMessage('The intent fill was successfully executed 🎉');
    logger.info(`receipt: ${JSON.stringify(receipt)}`);
    return receipt;
  }
}
