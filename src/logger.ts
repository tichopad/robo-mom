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

const prettyConsoleFormat = winston.format.printf((info) => {
	// Map log levels to emojis
	const levelEmojis: Record<string, string> = {
		error: "❌",
		warn: "⚠️",
		info: "ℹ️",
		debug: "🐛",
		verbose: "📝",
		silly: "🙃"
	};

	const emoji = levelEmojis[info.level] || "📄";
	const levelColor = {
		error: "\x1b[31m", // red
		warn: "\x1b[33m",  // yellow
		info: "\x1b[36m",  // cyan
		debug: "\x1b[35m", // magenta
		verbose: "\x1b[32m", // green
		silly: "\x1b[37m"  // white
	}[info.level] || "\x1b[0m";

	const reset = "\x1b[0m";

	// Format the message with splat support
	let message = info.message;
	if (info.splat && Array.isArray(info.splat) && info.splat.length > 0) {
		// Apply splat formatting
		const transformed = winston.format.splat().transform(info);
		if (transformed && typeof transformed === 'object' && 'message' in transformed) {
			message = transformed.message;
		}
	}

	return `${emoji}  ${levelColor}${message}${reset}`;
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

const prettyConsoleTransport = new winston.transports.Console({
	level: "info",
	format: winston.format.combine(
		winston.format.errors({ stack: true }),
		winston.format.splat(),
		prettyConsoleFormat
	),
});

export const logger = winston.createLogger({
	level: logLevel,
	defaultMeta: {
		service: "robo-mom",
	},
	transports: [defaultLogFileTransport, prettyConsoleTransport],
	exceptionHandlers: [defaultLogFileTransport],
});
