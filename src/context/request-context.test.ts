import { type TestContext, describe, test } from "node:test";
import {
	getRequestId,
	runWithRequestId,
} from "#src/context/request-context.ts";

describe("Request Context", () => {
	test("getRequestId returns null when no context is set", (t: TestContext) => {
		t.assert.strictEqual(getRequestId(), null);
	});

	test("runWithRequestId executes function with correct request ID and returns result", (t: TestContext) => {
		const requestId = crypto.randomUUID();
		const expectedResult = "test result";
		let capturedRequestId: string | null = null;

		const result = runWithRequestId(requestId, () => {
			capturedRequestId = getRequestId();
			return expectedResult;
		});

		t.assert.strictEqual(capturedRequestId, requestId);
		t.assert.strictEqual(result, expectedResult);
	});

	test("context is isolated between concurrent operations", async (t: TestContext) => {
		const requestId1 = crypto.randomUUID();
		const requestId2 = crypto.randomUUID();
		const requestId3 = crypto.randomUUID();

		const promises = [
			runWithRequestId(requestId1, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return getRequestId();
			}),
			runWithRequestId(requestId2, async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return getRequestId();
			}),
			runWithRequestId(requestId3, async () => {
				await new Promise((resolve) => setTimeout(resolve, 15));
				return getRequestId();
			}),
		];

		const results = await Promise.all(promises);

		t.assert.strictEqual(results[0], requestId1);
		t.assert.strictEqual(results[1], requestId2);
		t.assert.strictEqual(results[2], requestId3);
	});

	test("nested contexts work correctly - inner overrides outer, outer restores", async (t: TestContext) => {
		const outerRequestId = crypto.randomUUID();
		const innerRequestId = crypto.randomUUID();
		let innerCapturedRequestId: string | null = null;
		let outerRequestIdAfterInner: string | null = null;

		await runWithRequestId(outerRequestId, async () => {
			t.assert.strictEqual(getRequestId(), outerRequestId);

			await runWithRequestId(innerRequestId, async () => {
				innerCapturedRequestId = getRequestId();
			});

			outerRequestIdAfterInner = getRequestId();
		});

		t.assert.strictEqual(innerCapturedRequestId, innerRequestId);
		t.assert.strictEqual(outerRequestIdAfterInner, outerRequestId);
	});

	test("context persists across async boundaries and await calls", async (t: TestContext) => {
		const requestId = crypto.randomUUID();
		let beforeAwaitId: string | null = null;
		let afterAwaitId: string | null = null;
		let afterMultipleAwaits: string | null = null;

		await runWithRequestId(requestId, async () => {
			beforeAwaitId = getRequestId();
			await new Promise((resolve) => setTimeout(resolve, 5));
			afterAwaitId = getRequestId();
			await new Promise((resolve) => setTimeout(resolve, 5));
			afterMultipleAwaits = getRequestId();
		});

		t.assert.strictEqual(beforeAwaitId, requestId);
		t.assert.strictEqual(afterAwaitId, requestId);
		t.assert.strictEqual(afterMultipleAwaits, requestId);
	});

	test("context is properly cleaned up after async exceptions", async (t: TestContext) => {
		const requestId = crypto.randomUUID();
		let contextDuringException: string | null = null;

		try {
			await runWithRequestId(requestId, async () => {
				contextDuringException = getRequestId();
				await new Promise((resolve) => setTimeout(resolve, 5));
				throw new Error("Test async exception");
			});
		} catch (error) {
			// Exception expected
		}

		t.assert.strictEqual(contextDuringException, requestId);
		t.assert.strictEqual(getRequestId(), null);
	});

	test("context is properly cleaned up after synchronous exceptions", (t: TestContext) => {
		const requestId = crypto.randomUUID();
		let contextDuringException: string | null = null;

		try {
			runWithRequestId(requestId, () => {
				contextDuringException = getRequestId();
				throw new Error("Test sync exception");
			});
		} catch (error) {
			// Exception expected
		}

		t.assert.strictEqual(contextDuringException, requestId);
		t.assert.strictEqual(getRequestId(), null);
	});

	test("synchronous functions work correctly", (t: TestContext) => {
		const requestId = crypto.randomUUID();
		let capturedRequestId: string | null = null;

		const result = runWithRequestId(requestId, () => {
			capturedRequestId = getRequestId();
			return "sync result";
		});

		t.assert.strictEqual(capturedRequestId, requestId);
		t.assert.strictEqual(result, "sync result");
	});

	test("functions returning undefined or null work correctly", (t: TestContext) => {
		const requestId = crypto.randomUUID();

		const undefinedResult = runWithRequestId(requestId, () => undefined);
		const nullResult = runWithRequestId(requestId, () => null);
		const voidResult = runWithRequestId(requestId, () => {
			// Function with no return statement
		});

		t.assert.strictEqual(undefinedResult, undefined);
		t.assert.strictEqual(nullResult, null);
		t.assert.strictEqual(voidResult, undefined);
	});

	test("empty string request ID is handled correctly", (t: TestContext) => {
		const emptyRequestId = "";
		let capturedRequestId: string | null = null;

		runWithRequestId(emptyRequestId, () => {
			capturedRequestId = getRequestId();
		});

		t.assert.strictEqual(capturedRequestId, emptyRequestId);
	});
});
