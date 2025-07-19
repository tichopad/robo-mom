import winston from "winston";
import { getRequestId } from "#src/context/request-context.ts";
import { InMemoryTransport } from "./in-memory-transport.ts";

// Custom format to sort properties in desired order (optimized)
// TODO: replace with the default JSON format once there's a nicer log viewer than just inspecting the log file
const orderedJsonFormat = winston.format.printf((info) => {
	// Collect non-priority keys efficiently
	const otherKeys: string[] = [];
	for (const key in info) {
		if (
			key !== "level" &&
			key !== "service" &&
			key !== "message" &&
			key !== "timestamp" &&
			key !== "requestId"
		) {
			otherKeys.push(key);
		}
	}

	// Use native sort for reliability and performance on small arrays
	otherKeys.sort();

	// Build the ordered object directly (avoiding JSON string manipulation complexity)
	const result: Record<string, unknown> = {
		timestamp: info.timestamp,
		level: info.level,
		requestId: info.requestId,
		message: info.message,
	};

	// Add other properties in alphabetical order
	for (const key of otherKeys) {
		result[key] = info[key as keyof typeof info];
	}

	return JSON.stringify(result);
});

// Format to attach the request ID to the log entry
// Request ID groups logs related to a single LLM request cycle.
const attachRequestIdFormat = winston.format((info) => {
	if (typeof info === "object" && info !== null) {
		info.requestId ??= getRequestId();
	}
	return info;
});

// Common format for all logs
const format = winston.format.combine(
	winston.format.timestamp({
		format: "YYYY-MM-DD HH:mm:ss.SSS",
	}),
	attachRequestIdFormat(),
	winston.format.errors({ stack: true }),
	winston.format.splat(),
	orderedJsonFormat,
);

// Common metadata for all logs
const defaultMeta = {
	service: "robo-mom",
};

// Default transport for application logs
const defaultLogFileTransport = new winston.transports.File({
	filename: process.env.LOG_FILE || "debug.log",
	level: "debug",
});

/**
 * The default application logger that logs to a file.
 */
export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	defaultMeta,
	transports: [defaultLogFileTransport],
	exceptionHandlers: [defaultLogFileTransport],
	format,
});

/**
 * Creates a test logger that logs to an in-memory transport which can be inspected.
 * @returns The test logger and the in-memory transport.
 */
export const createTestLogger = () => {
	const inMemoryTransport = new InMemoryTransport();
	const testLogger = winston.createLogger({
		level: "debug",
		defaultMeta,
		format,
		transports: [inMemoryTransport],
	});

	// Set max listeners to prevent warnings during tests and heavy usage
	testLogger.setMaxListeners(20);

	return {
		logger: testLogger,
		inMemoryTransport,
	};
};
