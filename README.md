# Robo Mom: The World's Most Advanced Automated Robotic Notes Assistant!

*"Your family will never know the difference!"*

Robo Mom is a CLI application that lets you chat with your Markdown notes using AI. It uses advanced retrieval-augmented generation (RAG) to understand your notes and provide intelligent responses based on your personal knowledge base.

## What is Robo Mom?

Inspired by the legendary Johnny Bravo episode featuring "the world's most advanced automated robotic mother," Robo Mom is your clever assistant that knows all your notes (and thus, your life) and can tell you anything - including where you left your favorite shirt!

Robo Mom transforms your Markdown notes into an intelligent knowledge base that you can query through natural language. Whether you have daily notes, project documentation, or research notes, Robo Mom can help you:

- Find specific information across your notes
- Get contextual answers based on your personal knowledge
- Discover connections between different notes
- Navigate your knowledge base through conversation
- Remember where you put things (seriously, where did you leave that shirt?)

The app uses vector embeddings and semantic search to understand the meaning of your notes, making it easy to find relevant information even when you don't remember the exact words.

## Features

- **Semantic search** - Find notes based on meaning, not just keywords
- **Real-time chat interface** - Interactive CLI chat with streaming responses
- **Markdown support** - Works with your existing Markdown note structure
- **Vector embeddings** - Uses AI embeddings for intelligent document retrieval
- **File-based database** - Uses PGlite for local, file-based PostgreSQL storage
- **Frontmatter support** - Leverages YAML frontmatter for metadata

## Quick Start

### Prerequisites

- Node.js (latest version)
- pnpm package manager
- Gemini API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd robo-mom
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file with your Gemini API key:
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
   ```

### Usage

#### 1. Load your notes

First, index your Markdown notes into the database:

```bash
# Load all Markdown files from a directory
pnpm run cli load-files "path/to/your/notes/**/*.md"

# Example: Load example notes
pnpm run cli load-files "example_notes/**/*.md"
```

#### 2. Start chatting

Start an interactive chat session:

```bash
pnpm run cli chat
```

In the chat interface:
- Type your questions and press Enter to send
- Type `/exit` to quit the application
- Type `/new` to start a new conversation

## Development

### Tech stack

- Node.js with TypeScript
- `citty` for command-line interface
- `ink` (React for CLI) with streaming text
- `Vercel AI SDK` with Gemini integration
- `PGlite` (file-based PostgreSQL) with `Drizzle ORM`
- Vector search with `pgvector` using a local embeddings model via Transformers.js

### Project structure

```
src/
├── cli.ts                 # Main CLI entry point
├── app.tsx               # React app for chat interface
├── commands/             # CLI command definitions
├── db/                  # Database layer
├── dev-tools/           # Development utilities
│   ├── db-cli.ts        # SQL query interface
│   ├── rag-cli.ts       # RAG testing tool
│   └── ripgrep-cli.ts   # Ripgrep testing tool
├── ui/                  # React components
```

### Database Schema

The app uses a single `notes` table with the following structure defined in `db/schema.ts`.

### Development tools

The project includes several development tools to help with debugging and testing:

#### Database CLI (`pnpm run db:cli`)

Execute SQL queries against the local database:

```bash
# Execute a single query
pnpm run db:cli --query "SELECT * FROM notes LIMIT 5"

# Interactive SQL shell
pnpm run db:cli --interactive

# Save results to file
pnpm run db:cli --query "SELECT * FROM notes" --output results.json
```

#### Drizzle Studio (`pnpm run db:studio`)

Launch Drizzle Studio for visual database management:

```bash
pnpm run db:studio
```

#### Vector search testing (`pnpm run rag:cli`)

Test the retrieval-augmented generation system:

```bash
# Basic search
pnpm run rag:cli "project ideas"

# With limit and verbose output
pnpm run rag:cli "meeting notes" --limit 5 --verbose
```

#### Ripgrep testing (`pnpm run ripgrep:cli`)

Test text-based search functionality:

```bash
# Basic pattern search
pnpm run ripgrep:cli "TODO"

# Case-insensitive search
pnpm run ripgrep:cli "todo" --flags "-i"

# Word boundary search with limit
pnpm run ripgrep:cli "test" --flags "-w" --limit 10
```

### Available Scripts

- `pnpm run cli`: Run the main CLI application
- `pnpm run db:migrate`: Generate and run database migrations
- `pnpm run db:studio`: Launch Drizzle Studio
- `pnpm run db:cli`: Database query interface
- `pnpm run rag:cli`: RAG testing tool
- `pnpm run ripgrep:cli`: Ripgrep testing tool
- `pnpm run check`: Run code quality checks (Biome + TS)

### Development Workflow

1. **Database setup**: Run `pnpm run db:migrate` to set up the database
2. **Load test data**: Use `pnpm run cli load-files` to index your notes
3. **Test vector search**: Use `pnpm run rag:cli` to test document retrieval
4. **Test text search**: Use `pnpm run ripgrep:cli` to test text search
5. **Debug database**: Use `pnpm run db:cli` or `pnpm run db:studio` for database queries
6. **Run chat**: Use `pnpm run cli chat` to test the full application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm run check` to ensure code quality
5. Submit a pull request

## License

This project is licensed under the [Unlicense](license.md). Do whatever you want with it. I don't give a flying fuck.