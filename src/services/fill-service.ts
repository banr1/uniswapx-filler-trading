// services/reactor-contract-service.ts

import { ethers } from 'ethers';
import { config } from '../config';
import {
  MockERC20,
  MockERC20__factory,
  V2DutchOrderReactor,
  V2DutchOrderReactor__factory,
} from '@banr1/uniswapx-sdk/dist/src/contracts';
import { UNISWAP_REACTOR_ADDRESSES } from '../constants/uniswap-reactor-addresses';
import { CosignedV2DutchOrder } from '@banr1/uniswapx-sdk';
import consola from 'consola';

export class FillService {
  private filler: ethers.Wallet;
  private provider: ethers.providers.JsonRpcProvider;
  private reactor: V2DutchOrderReactor;
  private outputToken: MockERC20;

  constructor() {
    this.filler = new ethers.Wallet(config.privateKey);
    this.provider = new ethers.providers.JsonRpcProvider(config.alchemyApiKey);
    this.reactor = V2DutchOrderReactor__factory.connect(UNISWAP_REACTOR_ADDRESSES[config.chainId], this.filler);
    this.outputToken = MockERC20__factory.connect('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', this.filler); // USDT
  }

  async execute({ intent, signature }: { intent: CosignedV2DutchOrder; signature: string }) {
    const signedIntent = {
      order: intent.serialize(),
      sig: signature,
    };

    const gasLimit = 600_000;
    const ethBalance = await this.provider.getBalance(this.filler.address);
    if (ethBalance.lt(gasLimit)) {
      consola.error('Insufficient ETH balance for gas fee ☃️');
    }

    try {
      await this.outputToken.approve(UNISWAP_REACTOR_ADDRESSES[config.chainId], ethers.constants.MaxUint256);

      const tx = await this.reactor.execute(signedIntent, { gasLimit });
      const txReceipt = await tx.wait();
      consola.info('txReceipt:', txReceipt);
    } catch (error) {
      throw error;
    }
  }
}

export const fillService = new FillService();
