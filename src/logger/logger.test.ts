import { type TestContext, afterEach, describe, test } from "node:test";
import {
	getRequestId,
	runWithRequestId,
} from "#src/context/request-context.ts";
import { createTestLogger } from "#src/logger/logger.ts";

describe("Logger with Request ID", () => {
	const { logger: testLogger, inMemoryTransport } = createTestLogger();

	afterEach(() => {
		inMemoryTransport.clearLogs();
	});

	test("logger can be instantiated and used", (t: TestContext) => {
		// Test that the logger exists and can be used
		t.assert.ok(testLogger);
		t.assert.strictEqual(typeof testLogger.info, "function");
		t.assert.strictEqual(typeof testLogger.debug, "function");
		t.assert.strictEqual(typeof testLogger.warn, "function");
		t.assert.strictEqual(typeof testLogger.error, "function");
	});

	test("logger works without request context", (t: TestContext) => {
		// Test that logging works without request context
		t.assert.strictEqual(getRequestId(), null);

		const message = "Test message without context";
		testLogger.info(message);

		t.assert.strictEqual(inMemoryTransport.logs.length, 1);
		const log = inMemoryTransport.logs[0];
		t.assert.ok(log);
		t.assert.strictEqual(log.message, message);
		t.assert.strictEqual(log.requestId, null);
	});

	test("logger works with request context", async (t: TestContext) => {
		const requestId = crypto.randomUUID();

		await runWithRequestId(requestId, async () => {
			t.assert.strictEqual(getRequestId(), requestId);

			const message = "Test message with context";
			testLogger.info(message);

			t.assert.strictEqual(inMemoryTransport.logs.length, 1);
			const log = inMemoryTransport.logs[0];
			t.assert.ok(log);
			t.assert.strictEqual(log.message, message);
			t.assert.strictEqual(log.requestId, requestId);
		});
	});

	test("logger works with different log levels in request context", async (t: TestContext) => {
		const requestId = crypto.randomUUID();

		await runWithRequestId(requestId, async () => {
			// Test all log levels
			testLogger.debug("Debug message");
			testLogger.info("Info message");
			testLogger.warn("Warning message");
			testLogger.error("Error message");
		});

		t.assert.strictEqual(inMemoryTransport.logs.length, 4);

		const debugLog = inMemoryTransport.logs[0];
		t.assert.ok(debugLog);
		t.assert.strictEqual(debugLog.level, "debug");
		t.assert.strictEqual(debugLog.requestId, requestId);

		const infoLog = inMemoryTransport.logs[1];
		t.assert.ok(infoLog);
		t.assert.strictEqual(infoLog.level, "info");
		t.assert.strictEqual(infoLog.requestId, requestId);

		const warnLog = inMemoryTransport.logs[2];
		t.assert.ok(warnLog);
		t.assert.strictEqual(warnLog.level, "warn");
		t.assert.strictEqual(warnLog.requestId, requestId);

		const errorLog = inMemoryTransport.logs[3];
		t.assert.ok(errorLog);
		t.assert.strictEqual(errorLog.level, "error");
		t.assert.strictEqual(errorLog.requestId, requestId);
	});

	test("logger works with metadata in request context", async (t: TestContext) => {
		const requestId = crypto.randomUUID();

		await runWithRequestId(requestId, async () => {
			const metadata = {
				userId: "user123",
				action: "test",
				customField: "value",
			};
			testLogger.info("Message with metadata", metadata);

			t.assert.strictEqual(inMemoryTransport.logs.length, 1);
			const log = inMemoryTransport.logs[0];
			t.assert.ok(log);
			t.assert.strictEqual(log.requestId, requestId);
			t.assert.strictEqual(log.userId, metadata.userId);
			t.assert.strictEqual(log.action, metadata.action);
			t.assert.strictEqual(log.customField, metadata.customField);
		});
	});

	test("logger child works with request context", async (t: TestContext) => {
		const requestId = crypto.randomUUID();

		await runWithRequestId(requestId, async () => {
			const childLogger = testLogger.child({ component: "test-component" });
			childLogger.info("Message from child logger");

			t.assert.strictEqual(inMemoryTransport.logs.length, 1);
			const log = inMemoryTransport.logs[0];
			t.assert.ok(log);
			t.assert.strictEqual(log.requestId, requestId);
			t.assert.strictEqual(log.component, "test-component");
		});
	});

	test("logger works with error objects in request context", async (t: TestContext) => {
		const requestId = crypto.randomUUID();
		const errorMessage = "Test error for logging";

		await runWithRequestId(requestId, async () => {
			try {
				throw new Error(errorMessage);
			} catch (error) {
				testLogger.error("Caught error", { error });
			}

			t.assert.strictEqual(inMemoryTransport.logs.length, 1);
			const log = inMemoryTransport.logs[0];
			t.assert.ok(log);
			t.assert.strictEqual(log.requestId, requestId);
			t.assert.ok(log.error instanceof Error);
			t.assert.strictEqual((log.error as Error).message, errorMessage);
		});
	});

	test("logger works across multiple request contexts", async (t: TestContext) => {
		const requestId1 = crypto.randomUUID();
		const requestId2 = crypto.randomUUID();

		await runWithRequestId(requestId1, async () => {
			t.assert.strictEqual(getRequestId(), requestId1);
			testLogger.info("Message in first context");
		});

		await runWithRequestId(requestId2, async () => {
			t.assert.strictEqual(getRequestId(), requestId2);
			testLogger.info("Message in second context");
		});

		t.assert.strictEqual(inMemoryTransport.logs.length, 2);
		const log1 = inMemoryTransport.logs[0];
		t.assert.ok(log1);
		t.assert.strictEqual(log1.requestId, requestId1);
		const log2 = inMemoryTransport.logs[1];
		t.assert.ok(log2);
		t.assert.strictEqual(log2.requestId, requestId2);
	});

	test("logger works with concurrent request contexts", async (t: TestContext) => {
		const requestId1 = crypto.randomUUID();
		const requestId2 = crypto.randomUUID();
		const requestId3 = crypto.randomUUID();

		const promises = [
			runWithRequestId(requestId1, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				testLogger.info("Message from context 1");
			}),
			runWithRequestId(requestId2, async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				testLogger.info("Message from context 2");
			}),
			runWithRequestId(requestId3, async () => {
				await new Promise((resolve) => setTimeout(resolve, 15));
				testLogger.info("Message from context 3");
			}),
		];

		await Promise.all(promises);

		t.assert.strictEqual(inMemoryTransport.logs.length, 3);

		const loggedRequestIds = inMemoryTransport.logs.map((log) => log.requestId);

		t.assert.ok(loggedRequestIds.includes(requestId1));
		t.assert.ok(loggedRequestIds.includes(requestId2));
		t.assert.ok(loggedRequestIds.includes(requestId3));
	});

	test("logger works with nested request contexts", async (t: TestContext) => {
		const outerRequestId = crypto.randomUUID();
		const innerRequestId = crypto.randomUUID();

		await runWithRequestId(outerRequestId, async () => {
			t.assert.strictEqual(getRequestId(), outerRequestId);
			testLogger.info("Message in outer context");

			await runWithRequestId(innerRequestId, async () => {
				t.assert.strictEqual(getRequestId(), innerRequestId);
				testLogger.info("Message in inner context");
			});

			t.assert.strictEqual(getRequestId(), outerRequestId);
			testLogger.info("Message back in outer context");
		});

		t.assert.strictEqual(inMemoryTransport.logs.length, 3);
		const log1 = inMemoryTransport.logs[0];
		t.assert.ok(log1);
		t.assert.strictEqual(log1.requestId, outerRequestId);

		const log2 = inMemoryTransport.logs[1];
		t.assert.ok(log2);
		t.assert.strictEqual(log2.requestId, innerRequestId);

		const log3 = inMemoryTransport.logs[2];
		t.assert.ok(log3);
		t.assert.strictEqual(log3.requestId, outerRequestId);
	});

	test("logger works without context after having context", async (t: TestContext) => {
		const requestId = crypto.randomUUID();

		// First log without context
		t.assert.strictEqual(getRequestId(), null);
		testLogger.info("Message without context");

		// Then log with context
		await runWithRequestId(requestId, async () => {
			t.assert.strictEqual(getRequestId(), requestId);
			testLogger.info("Message with context");
		});

		// Then log without context again
		t.assert.strictEqual(getRequestId(), null);
		testLogger.info("Message without context again");

		t.assert.strictEqual(inMemoryTransport.logs.length, 3);
		const log1 = inMemoryTransport.logs[0];
		t.assert.ok(log1);
		t.assert.strictEqual(log1.requestId, null);

		const log2 = inMemoryTransport.logs[1];
		t.assert.ok(log2);
		t.assert.strictEqual(log2.requestId, requestId);

		const log3 = inMemoryTransport.logs[2];
		t.assert.ok(log3);
		t.assert.strictEqual(log3.requestId, null);
	});

	test("logger handles exceptions gracefully", async (t: TestContext) => {
		const requestId = crypto.randomUUID();

		try {
			await runWithRequestId(requestId, async () => {
				testLogger.info("Message before exception");
				throw new Error("Test exception");
			});
		} catch (error) {
			// Exception should be caught
			t.assert.ok(error instanceof Error);
		}

		// Logger should still work after exception
		t.assert.strictEqual(getRequestId(), null);
		testLogger.info("Message after exception");

		t.assert.strictEqual(inMemoryTransport.logs.length, 2);
		const log1 = inMemoryTransport.logs[0];
		t.assert.ok(log1);
		t.assert.strictEqual(log1.requestId, requestId);
		t.assert.strictEqual(log1.message, "Message before exception");

		const log2 = inMemoryTransport.logs[1];
		t.assert.ok(log2);
		t.assert.strictEqual(log2.requestId, null);
		t.assert.strictEqual(log2.message, "Message after exception");
	});
});
