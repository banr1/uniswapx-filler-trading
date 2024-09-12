// main.ts

import { consola } from 'consola';
import { config } from './config';
import { fetchService } from './services/fetch-service';
import { fillService } from './services/fill-service';
import { evaluationService } from './services/evaluation-service';

async function monitorIntents(): Promise<void> {
  try {
    const intentAndSignature = await fetchService.fetchIntent();
    if (intentAndSignature === null) return;
    const evaluation = await evaluationService.evaluate(intentAndSignature.intent);
    if (evaluation === false) return;

    await fillService.execute(intentAndSignature);
  } catch (error) {
    consola.error('An error occurred 🚨 in the main function:', error);
  }
}

async function main(): Promise<void> {
  const { interval } = config;
  consola.info('Starting the main function 🚀 with', interval / 1000, 's interval');
  setInterval(monitorIntents, interval);
}

main().catch(error => {
  consola.error('An error occurred 🚨 in the main function:', error);
});
