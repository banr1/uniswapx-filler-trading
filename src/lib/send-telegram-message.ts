// lib/send-telegram-message.ts

import { logger } from 'ethers';
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';

const bot = new TelegramBot(config.telegramApiKey, { polling: false });

export async function sendTelegramMessage(message: string) {
  try {
    await bot.sendMessage(config.telegramChatId, message, {
      message_thread_id: config.telegramTopicId,
    });
    logger.info('Telegram message sent successfully');
  } catch (error) {
    throw new Error(`Error sending message: ${error}`);
  }
}
