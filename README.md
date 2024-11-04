# UniswapX Filler Trading

## Getting Started
Here's a README section for setting up the development environment, based on the steps you provided:

## Development Setup

To set up the development environment, follow these steps:

1. Install dependencies:
   ```
   pnpm install
   ```

2. Create a local environment file:
   ```
   cp .env.example .env
   ```

3. Fill in the required environment variables in the `.env` file. Make sure to provide valid values for all necessary fields.
   - `PRIVATE_KEY`: The private key of the wallet that will be used to fill an intent.
   - `ALCHEMY_API_KEY`: The Alchemy API key to use for interacting with the Arbitrum network.
   - `TELEGRAM_API_KEY`: The API key for the Telegram bot.
   - `TELEGRAM_CHAT_ID`: The chat ID for the Telegram bot.
   - `TELEGRAM_TOPIC_ID``: The topic ID for the Telegram bot.
4. Start the development server:
   ```
   pnpm dev
   ```

After completing these steps, your development environment should be up and running. You can now begin working on the project locally.
