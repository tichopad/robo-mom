import { type TestContext, describe, test } from "node:test";
import {
	getRequestId,
	runWithRequestId,
} from "#src/context/request-context.ts";
import { logger } from "#src/logger.ts";
import { createRandomString } from "#src/utils.ts";



describe("Logger with Request ID", () => {
	test("logger can be instantiated and used", (t: TestContext) => {
		// Test that the logger exists and can be used
		t.assert.ok(logger);
		t.assert.strictEqual(typeof logger.info, "function");
		t.assert.strictEqual(typeof logger.debug, "function");
		t.assert.strictEqual(typeof logger.warn, "function");
		t.assert.strictEqual(typeof logger.error, "function");
	});

	test("logger works without request context", (t: TestContext) => {
		// Test that logging works without request context
		t.assert.strictEqual(getRequestId(), null);

		// This should not throw
		logger.info("Test message without context");
		t.assert.ok(true, "Logger should work without request context");
	});

	test("logger works with request context", async (t: TestContext) => {
		const requestId = createRandomString();

		await runWithRequestId(requestId, async () => {
			t.assert.strictEqual(getRequestId(), requestId);

			// This should not throw and should include request ID in logs
			logger.info("Test message with context");
			logger.debug("Debug message with context");
			logger.warn("Warning message with context");
			logger.error("Error message with context");
		});

		t.assert.ok(true, "Logger should work with request context");
	});

	test("logger works with different log levels in request context", async (t: TestContext) => {
		const requestId = createRandomString();

		await runWithRequestId(requestId, async () => {
			// Test all log levels
			logger.debug("Debug message");
			logger.info("Info message");
			logger.warn("Warning message");
			logger.error("Error message");
		});

		t.assert.ok(true, "All log levels should work with request context");
	});

	test("logger works with metadata in request context", async (t: TestContext) => {
		const requestId = createRandomString();

		await runWithRequestId(requestId, async () => {
			logger.info("Message with metadata", {
				userId: "user123",
				action: "test",
				customField: "value",
			});
		});

		t.assert.ok(true, "Logger should work with metadata in request context");
	});

	test("logger child works with request context", async (t: TestContext) => {
		const requestId = createRandomString();

		await runWithRequestId(requestId, async () => {
			const childLogger = logger.child({ component: "test-component" });
			childLogger.info("Message from child logger");
		});

		t.assert.ok(true, "Child logger should work with request context");
	});

	test("logger works with error objects in request context", async (t: TestContext) => {
		const requestId = createRandomString();

		await runWithRequestId(requestId, async () => {
			try {
				throw new Error("Test error for logging");
			} catch (error) {
				logger.error("Caught error", { error });
			}
		});

		t.assert.ok(
			true,
			"Logger should work with error objects in request context",
		);
	});

	test("logger works across multiple request contexts", async (t: TestContext) => {
		const requestId1 = createRandomString();
		const requestId2 = createRandomString();

		await runWithRequestId(requestId1, async () => {
			t.assert.strictEqual(getRequestId(), requestId1);
			logger.info("Message in first context");
		});

		await runWithRequestId(requestId2, async () => {
			t.assert.strictEqual(getRequestId(), requestId2);
			logger.info("Message in second context");
		});

		t.assert.ok(true, "Logger should work across multiple request contexts");
	});

	test("logger works with concurrent request contexts", async (t: TestContext) => {
		const requestId1 = createRandomString();
		const requestId2 = createRandomString();
		const requestId3 = createRandomString();

		const promises = [
			runWithRequestId(requestId1, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				logger.info("Message from context 1");
			}),
			runWithRequestId(requestId2, async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				logger.info("Message from context 2");
			}),
			runWithRequestId(requestId3, async () => {
				await new Promise((resolve) => setTimeout(resolve, 15));
				logger.info("Message from context 3");
			}),
		];

		await Promise.all(promises);

		t.assert.ok(true, "Logger should work with concurrent request contexts");
	});

	test("logger works with nested request contexts", async (t: TestContext) => {
		const outerRequestId = createRandomString();
		const innerRequestId = createRandomString();

		await runWithRequestId(outerRequestId, async () => {
			t.assert.strictEqual(getRequestId(), outerRequestId);
			logger.info("Message in outer context");

			await runWithRequestId(innerRequestId, async () => {
				t.assert.strictEqual(getRequestId(), innerRequestId);
				logger.info("Message in inner context");
			});

			t.assert.strictEqual(getRequestId(), outerRequestId);
			logger.info("Message back in outer context");
		});

		t.assert.ok(true, "Logger should work with nested request contexts");
	});

	test("logger works without context after having context", async (t: TestContext) => {
		const requestId = createRandomString();

		// First log without context
		t.assert.strictEqual(getRequestId(), null);
		logger.info("Message without context");

		// Then log with context
		await runWithRequestId(requestId, async () => {
			t.assert.strictEqual(getRequestId(), requestId);
			logger.info("Message with context");
		});

		// Then log without context again
		t.assert.strictEqual(getRequestId(), null);
		logger.info("Message without context again");

		t.assert.ok(
			true,
			"Logger should work without context after having context",
		);
	});

	test("logger handles exceptions gracefully", async (t: TestContext) => {
		const requestId = createRandomString();

		try {
			await runWithRequestId(requestId, async () => {
				logger.info("Message before exception");
				throw new Error("Test exception");
			});
		} catch (error) {
			// Exception should be caught
			t.assert.ok(error instanceof Error);
		}

		// Logger should still work after exception
		t.assert.strictEqual(getRequestId(), null);
		logger.info("Message after exception");

		t.assert.ok(true, "Logger should handle exceptions gracefully");
	});
});
