// lib/send-telegram-message.ts

import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import winston from 'winston';

const bot = new TelegramBot(config.telegramApiKey, { polling: false });

export async function sendTelegramMessage(message: string) {
  try {
    await bot.sendMessage(config.telegramChatId, message, {
      message_thread_id: config.telegramTopicId,
    });
    winston.info('Telegram message sent successfully');
  } catch (error) {
    winston.log('error', 'Error sending Telegram message', error);
  }
}
