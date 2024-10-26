// services/reactor-contract-service.ts

import { V2DutchOrderReactor } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { logger } from '../logger';
import { ContractReceipt, Wallet } from 'ethers';
import { ERC20 } from '../types/typechain';
import { IntentWithSignature } from '../types/intent-with-signature';
import { SignedOrderStruct } from '@banr1/uniswapx-sdk/dist/src/contracts/V2DutchOrderReactor';

interface FillServiceConstructorArgs {
  wallet: Wallet;
  reactor: V2DutchOrderReactor;
  inputTokens: ERC20[];
  outputTokens: ERC20[];
}

// FillService class
// This class is responsible for filling intents
// It executes the fill intent transaction and swaps the input token back to the original token
export class FillService {
  // private wallet: Wallet;
  private reactor: V2DutchOrderReactor;
  // private inputTokens: ERC20[];
  // private outputTokens: ERC20[];

  constructor({
    // wallet,
    reactor,
    // inputTokens,
    // outputTokens,
  }: FillServiceConstructorArgs) {
    // this.wallet = wallet;
    this.reactor = reactor;
    // this.inputTokens = inputTokens;
    // this.outputTokens = outputTokens;
  }

  // Fill the intent and swap the input token back to the original token
  async fillIntent({ intent, signature }: IntentWithSignature): Promise<void> {
    // let txReceipt: ContractReceipt;
    try {
      await this.executeFill(intent, signature);
    } catch (error) {
      logger.error(`Error occurred while filling the intent 🚨: ${error}`);
      throw error;
    }
    // try {
    //   await this.swapInputTokenBackToOriginalToken(intent, txReceipt);
    // } catch (error) {
    //   logger.error(
    //     `Error occurred while swapping the input token back to the original token 🚨: ${error}`,
    //   );
    //   throw error;
    // }
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
    logger.info('Filled the intent successfully!!🎉');
    logger.info(`receipt: ${JSON.stringify(receipt)}`);
    return receipt;
  }
}
