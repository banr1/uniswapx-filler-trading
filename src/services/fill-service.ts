// services/reactor-contract-service.ts

import { V2DutchOrderReactor } from '@banr1/uniswapx-sdk/dist/src/contracts';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import { logger } from '../logger';
import { TxHash } from '../types/hash';

export class FillService {
  private reactor: V2DutchOrderReactor;

  constructor({ reactor }: { reactor: V2DutchOrderReactor }) {
    this.reactor = reactor;
  }

  async fillIntent({ intent, signature }: { intent: CosignedV2DutchOrder; signature: string }): Promise<TxHash> {
    const signedIntent = {
      order: intent.serialize(),
      sig: signature,
    };

    const gasLimit = 600_000;
    try {
      logger.info('Starting to fill the intent 🦄');
      const tx = await this.reactor.execute(signedIntent, { gasLimit });
      const txReceipt = await tx.wait();

      logger.info(`Filled the intent successfully 🎉`);
      logger.info(`txReceipt: ${txReceipt}`);

      return txReceipt.transactionHash;
    } catch (error) {
      throw error;
    }
  }
}
