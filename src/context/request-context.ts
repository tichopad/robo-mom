import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AsyncLocalStorage instance to store request IDs throughout the request lifecycle.
 */
const requestIdStorage = new AsyncLocalStorage<string>();

/**
 * Get the current request ID from the async context.
 * @returns The current request ID, or null if not set.
 */
export function getRequestId(): string | null {
	return requestIdStorage.getStore() ?? null;
}

/**
 * Set the request ID in the current async context.
 * @param requestId - The request ID to set.
 */
export function setRequestId(requestId: string): void {
	requestIdStorage.enterWith(requestId);
}

/**
 * Run a function within a request context with the given request ID.
 * @param requestId - The request ID to use for this context.
 * @param fn - The function to run within the request context.
 * @returns The result of the function.
 */
export async function runWithRequestId<T>(
	requestId: string,
	fn: () => Promise<T> | T,
): Promise<T> {
	return requestIdStorage.run(requestId, fn);
}
