// No imports needed - using only console.log and Node.js built-ins

/**
 * Print utilities for user-facing informational messages.
 * Separate from debug logging - this is specifically for terminal output to users.
 */
export const print = {
	/**
	 * Print an informational message with formatting
	 */
	info(message: string, ...args: unknown[]): void {
		const emoji = "ℹ️";
		const color = "\x1b[36m"; // cyan
		const reset = "\x1b[0m";

		const formattedMessage = `${emoji}  ${color}${message}${reset}`;
		console.log(formattedMessage, ...args);
	},

	/**
	 * Print a success message with formatting
	 */
	success(message: string, ...args: unknown[]): void {
		const emoji = "✅";
		const color = "\x1b[32m"; // green
		const reset = "\x1b[0m";

		const formattedMessage = `${emoji}  ${color}${message}${reset}`;
		console.log(formattedMessage, ...args);
	},

	/**
	 * Print a message without formatting - plain text output
	 */
	plain(message: string, ...args: unknown[]): void {
		console.log(message, ...args);
	},
};
