# TODO

- [ ] Looks like there's a **memory leak** in the data loading process -> verify and fix
- [ ] Use a specific console print function to log UI stuff instead of the logger -> logger should only serve for debugging purposes and not user-facing stuff
- [ ] Use Ink's community components for the UI
- [x] Drop all chunks stored in DB when a file changes
- [ ] Clean and update dependencies
- [ ] Build the app as a single binary and/or ship to NPM (or JSR)
- [ ] Figure out how to use GPU for embedding generation via Transformers.js
- [ ] Implement a watch mode
- [ ] Add more tool calls for the assistant (file browsing, SQL queries, etc.)
- [ ] Add "New conversation" option to the chat UI
- [ ] Try local LLMs or different LLM providers
- [ ] Add token counting and cost estimation to the chat UI
- [ ] Consider moving back to Deno since Transformers.js should now support Deno very well OR at least upgrade to Node 24

## Potential memory leak

Could it be the logger?
It looks like it might not be a leak, but the data loading process is eating way too much memory given it's supposed to
process a file at a time.