// lib/telegram.ts

import { logger } from 'ethers';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';

const bot = new TelegramBot(config.telegramApiKey, { polling: false });

const chatId = -4568114639;

export async function sendMessage(message: string) {
  try {
    await bot.sendMessage(chatId, message);
    logger.info('Message sent successfully');
  } catch (error) {
    throw new Error(`Error sending message: ${error}`);
  }
}
