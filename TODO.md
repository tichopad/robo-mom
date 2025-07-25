# TODO

## Bugs, issues, refactors and improvements

- [ ] Data loading seems to eat too much memory -> verify and fix
- [ ] Store the LLM inference input and output somewhere in a separate spot where it can be used for debugging and analysis
- [ ] Filename vector search might not work as expected - consider a different approach for including the filename in the context search
- [ ] Consider smaller chunks and including -1 and +1 indexed chunks in the context search for a more accurate context retrieval
- [x] Use Node's async context to track the current request ID instead of props drilling

## Features

- [ ] Build the app as a single binary and/or ship to NPM (or JSR) - consider shipping as a Docker image instead or use Node's single file binary feature
- [ ] Use Ink's community components for the UI where possible
- [ ] Figure out how to use GPU for embedding generation via Transformers.js (doesn't work with WSL)
- [ ] Implement a watch mode
- [ ] Clean and update dependencies
- [ ] Try local LLMs or different LLM providers
- [ ] Add token counting and cost estimation to the chat UI
- [ ] Add a shortcut for copying the last message to the clipboard
- [ ] Add a way to switch between different models
- [ ] Add a Markdown renderer
- [ ] Add MCP support
- [ ] Consider moving back to Deno since Transformers.js should now support Deno very well OR at least upgrade to Node 24
- [x] Add more tool calls for the assistant (file browsing, SQL queries, etc.) to improve document retrieval
- [x] Use a specific console print function to log UI stuff instead of the logger -> logger should only serve for debugging purposes and not user-facing stuff
- [x] Drop all chunks stored in DB when a file changes
- [x] Add "New conversation" option to the chat UI