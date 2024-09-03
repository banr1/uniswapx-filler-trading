import winston from 'winston';

const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return JSON.stringify({
    level: level.toUpperCase(),
    message,
    timestamp: new Date(timestamp).toISOString(),
  });
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), customFormat),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
