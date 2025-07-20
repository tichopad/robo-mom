import {
	getRequestId,
	runWithRequestId,
} from "#src/context/request-context.ts";
import { createRandomString } from "#src/utils.ts";
import { type TestContext, describe, test } from "node:test";

describe("Request Context", () => {
	test("getRequestId returns null when no context is set", (t: TestContext) => {
		t.assert.strictEqual(getRequestId(), null);
	});

	test("runWithRequestId executes function with correct request ID and returns result", async (t: TestContext) => {
		const requestId = createRandomString();
		const expectedResult = "test result";
		let capturedRequestId: string | null = null;

		const result = await runWithRequestId(requestId, async () => {
			capturedRequestId = getRequestId();
			return expectedResult;
		});

		t.assert.strictEqual(capturedRequestId, requestId);
		t.assert.strictEqual(result, expectedResult);
	});

	test("context is isolated between concurrent operations", async (t: TestContext) => {
		const requestId1 = createRandomString();
		const requestId2 = createRandomString();
		const requestId3 = createRandomString();

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
		const outerRequestId = createRandomString();
		const innerRequestId = createRandomString();
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
		const requestId = createRandomString();
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
		const requestId = createRandomString();
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

	test("context is properly cleaned up after synchronous exceptions", async (t: TestContext) => {
		const requestId = createRandomString();
		let contextDuringException: string | null = null;

		try {
			await runWithRequestId(requestId, () => {
				contextDuringException = getRequestId();
				throw new Error("Test sync exception");
			});
		} catch (error) {
			// Exception expected
		}

		t.assert.strictEqual(contextDuringException, requestId);
		t.assert.strictEqual(getRequestId(), null);
	});

	test("synchronous functions work correctly", async (t: TestContext) => {
		const requestId = createRandomString();
		let capturedRequestId: string | null = null;

		const result = await runWithRequestId(requestId, () => {
			capturedRequestId = getRequestId();
			return "sync result";
		});

		t.assert.strictEqual(capturedRequestId, requestId);
		t.assert.strictEqual(result, "sync result");
	});

	test("functions returning undefined or null work correctly", async (t: TestContext) => {
		const requestId = createRandomString();

		const undefinedResult = await runWithRequestId(requestId, () => undefined);
		const nullResult = await runWithRequestId(requestId, () => null);
		const voidResult = await runWithRequestId(requestId, () => {
			// Function with no return statement
		});

		t.assert.strictEqual(undefinedResult, undefined);
		t.assert.strictEqual(nullResult, null);
		t.assert.strictEqual(voidResult, undefined);
	});

	test("empty string request ID is handled correctly", async (t: TestContext) => {
		const emptyRequestId = "";
		let capturedRequestId: string | null = null;

		await runWithRequestId(emptyRequestId, () => {
			capturedRequestId = getRequestId();
		});

		t.assert.strictEqual(capturedRequestId, emptyRequestId);
	});
});
