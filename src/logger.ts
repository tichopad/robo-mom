import winston from "winston";

const logLevel = process.env.LOG_LEVEL || "info";

const logger = winston.createLogger({
	level: logLevel,
	defaultMeta: {
		service: "robo-mom"
	},
	transports: [
		new winston.transports.File({
			filename: "debug.log",
			level: logLevel,
			format: winston.format.combine(
				winston.format.timestamp({
					format: "YYYY-MM-DD HH:mm:ss.SSS",
				}),
				winston.format.errors({ stack: true }),
				winston.format.splat(),
				winston.format.json(),
			),
		}),
	],
});

export default logger;
