import type { Logform } from "winston";
import Transport from "winston-transport";

/**
 * A Winston transport that stores log entries in memory.
 * This is mostly useful for testing purposes.
 */
export class InMemoryTransport extends Transport {
	public logs: Logform.TransformableInfo[] = [];

	/**
	 * The log method that stores the log entry in memory.
	 * @param info - The log entry information.
	 * @param callback - The callback to be called when the log entry is processed.
	 */
	log(info: Logform.TransformableInfo, callback: () => void) {
		this.logs.push(info);
		callback();
	}

	/**
	 * Clears all logs stored in memory.
	 */
	clearLogs() {
		this.logs = [];
	}
}
