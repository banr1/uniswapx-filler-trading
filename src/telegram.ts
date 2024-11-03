// lib/telegram.ts

import { logger } from 'ethers';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(
  process.env.TELEGRAM_API_KEY ||
    '8019118829:AAGG17RXl0IGAh_Ox2tTW_4F7FEVazHM3no',
  { polling: false },
);

const chatId = -4568114639;

export async function sendMessage(message: string) {
  try {
    await bot.sendMessage(chatId, message);
    logger.info('Message sent successfully');
  } catch (error) {
    throw new Error(`Error sending message: ${error}`);
  }
}
