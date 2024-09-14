// main.ts

import { config } from './config';
import { logger } from './logger';
import { preparationService } from './services';
import { EvaluationService } from './services/evaluation-service';
import { FetchService } from './services/fetch-service';
import { FillService } from './services/fill-service';

async function monitorIntent({
  fetchService,
  evaluationService,
  fillService,
}: {
  fetchService: FetchService;
  evaluationService: EvaluationService;
  fillService: FillService;
}): Promise<void> {
  try {
    // Step 1: Fetch the intent
    // Retrieve the intent and signature from the API and filter out the non targeted intents
    const intentAndSignature = await fetchService.fetchIntent();
    if (intentAndSignature === null) return;

    // Step 2: Evaluate the intent
    // Check if the intent meets certain conditions
    const evaluation = await evaluationService.evaluateIntent(intentAndSignature.intent);
    if (evaluation === null) return;

    // Step 3: Fill the intent
    // Fill the intent with the signature
    await fillService.fillIntent(intentAndSignature);
  } catch (error) {
    logger.error(`An error occurred 🚨 in the main function: ${error}`);
  }
}

async function main(): Promise<void> {
  const preparation = await preparationService.initialize();
  const { provider, filler, outputToken, reactor } = preparation;
  const fetchService = new FetchService({ filler, provider, outputToken });
  const evaluationService = new EvaluationService({ filler, outputToken });
  const fillService = new FillService({ reactor });

  const { interval } = config;
  logger.info(`Starting the main function 🚀 with ${interval / 1000}s interval`);
  setInterval(monitorIntent, interval, { fetchService, evaluationService, fillService });
}

main().catch(error => {
  logger.error(`An error occurred 🚨 in the main function: ${error}`);
});
