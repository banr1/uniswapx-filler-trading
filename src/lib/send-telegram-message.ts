// lib/send-telegram-message.ts

import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { logger } from '../logger';

const bot = new TelegramBot(config.telegramApiKey, { polling: false });

export async function sendTelegramMessage(message: string) {
  try {
    await bot.sendMessage(config.telegramChatId, message, {
      message_thread_id: config.telegramTopicId,
    });
    logger.info('Telegram message sent successfully');
  } catch (error) {
    logger.error('Error sending Telegram message', error);
  }
}
