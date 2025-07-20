import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AsyncLocalStorage instance to store conversation IDs throughout the conversation lifecycle.
 * This enables tracking of conversation context across async operations and function calls,
 * allowing us to associate multiple requests and operations with a single conversation session.
 */
const conversationIdStorage = new AsyncLocalStorage<string>();

/**
 * Get the current conversation ID from the async context.
 *
 * This function retrieves the conversation ID that was set for the current async context.
 * It's used to associate operations, logging, and analytics with a specific conversation.
 *
 * @returns The current conversation ID, or null if no conversation context is set.
 */
export function getConversationId(): string | null {
	return conversationIdStorage.getStore() ?? null;
}

/**
 * Set the conversation ID in the current async context.
 *
 * This function sets the conversation ID for the current async context and all
 * subsequent async operations that inherit from this context. This is typically
 * called when starting a new conversation or when switching conversation contexts.
 *
 * @param conversationId - The conversation ID to set for the current context.
 */
export function setConversationId(conversationId: string): void {
	conversationIdStorage.enterWith(conversationId);
}

/**
 * Run a function within a conversation context with the given conversation ID.
 *
 * This function executes the provided function within a specific conversation context,
 * ensuring that all async operations within the function (and any functions it calls)
 * have access to the same conversation ID. This is the preferred way to establish
 * conversation context for a series of operations.
 *
 * @param conversationId - The conversation ID to use for this context.
 * @param fn - The function to run within the conversation context. Can be sync or async.
 * @returns A promise that resolves to the result of the function.
 *
 * @example
 * ```typescript
 * const conversationId = createRandomString();
 * const result = await runWithConversationId(conversationId, async () => {
 *   // All operations here have access to the conversation ID
 *   const currentId = getConversationId(); // Returns the conversation ID
 *   await someAsyncOperation();
 *   return someResult;
 * });
 * ```
 */
export async function runWithConversationId<T>(
	conversationId: string,
	fn: () => Promise<T> | T,
): Promise<T> {
	return conversationIdStorage.run(conversationId, fn);
}
