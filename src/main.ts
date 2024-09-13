// main.ts

import { config } from './config';
import { fetchService } from './services/fetch-service';
import { fillService } from './services/fill-service';
import { evaluationService } from './services/evaluation-service';
import { logger } from './logger';

async function monitorIntent(): Promise<void> {
  try {
    const intentAndSignature = await fetchService.fetchIntent();
    if (intentAndSignature === null) return;

    const evaluation = await evaluationService.evaluateIntent(intentAndSignature.intent);
    if (evaluation === null) return;

    await fillService.fillIntent(intentAndSignature);
  } catch (error) {
    logger.error('An error occurred 🚨 in the main function:', error);
  }
}

async function main(): Promise<void> {
  const { interval } = config;
  logger.info(`Starting the main function 🚀 with ${interval / 1000}s interval`);
  setInterval(monitorIntent, interval);
}

main().catch(error => {
  logger.error('An error occurred 🚨 in the main function:', error);
});
