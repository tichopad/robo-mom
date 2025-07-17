import winston from "winston";

const logLevel = process.env.LOG_LEVEL || "info";
const logFile = process.env.LOG_FILE || "debug.log";

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
			key !== "timestamp"
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
		requestId: info.requestId ?? null,
		message: info.message,
	};

	// Add other properties in alphabetical order
	for (const key of otherKeys) {
		result[key] = info[key as keyof typeof info];
	}

	return JSON.stringify(result);
});

const defaultLogFileTransport = new winston.transports.File({
	filename: logFile,
	level: "debug",
	format: winston.format.combine(
		winston.format.timestamp({
			format: "YYYY-MM-DD HH:mm:ss.SSS",
		}),
		winston.format.errors({ stack: true }),
		winston.format.splat(),
		orderedJsonFormat,
	),
});

export const logger = winston.createLogger({
	level: logLevel,
	defaultMeta: {
		service: "robo-mom",
	},
	transports: [defaultLogFileTransport],
	exceptionHandlers: [defaultLogFileTransport],
});

// Test that logging works
logger.info("Logger initialized", {
	logLevel,
	logFile,
	timestamp: new Date().toISOString(),
});
