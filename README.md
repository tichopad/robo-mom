# Robo-Mom CLI Chat Interface

A simple CLI-based chat interface using Ink and Vercel's AI SDK.

## Setup

1. Install dependencies:
   ```
   pnpm install
   ```

2. Create a `.env` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

Run the chat interface:

```
pnpm run ink
```

### Chat Commands

- Type your message and press Enter to send
- Type `/exit` and press Enter to quit the application

## Features

- Real-time text streaming from the AI assistant
- Simple and intuitive CLI interface
- Input history tracking
- Error handling for API failures

## Tech Stack

- Node.js and TypeScript
- Ink (React for CLI interfaces)
- Vercel AI SDK
- OpenAI API