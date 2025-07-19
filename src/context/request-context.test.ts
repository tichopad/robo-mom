import { type TestContext, describe, test } from "node:test";
import {
	getRequestId,
	runWithRequestId,
	setRequestId,
} from "#src/context/request-context.ts";
import { createRandomString } from "#src/utils.ts";

describe("Request Context", () => {
	test("getRequestId returns null when no context is set", (t: TestContext) => {
		t.assert.strictEqual(getRequestId(), null);
	});

	test("setRequestId sets the request ID in current context", (t: TestContext) => {
		const requestId = createRandomString();
		setRequestId(requestId);
		t.assert.strictEqual(getRequestId(), requestId);
	});

	test("runWithRequestId executes function with correct request ID", async (t: TestContext) => {
		const requestId = createRandomString();
		let capturedRequestId: string | null = null;

		await runWithRequestId(requestId, async () => {
			capturedRequestId = getRequestId();
		});

		t.assert.strictEqual(capturedRequestId, requestId);
	});

	test("runWithRequestId returns the function's result", async (t: TestContext) => {
		const requestId = createRandomString();
		const expectedResult = "test result";

		const result = await runWithRequestId(requestId, async () => {
			return expectedResult;
		});

		t.assert.strictEqual(result, expectedResult);
	});

	test("request ID is isolated between different runWithRequestId calls", async (t: TestContext) => {
		const requestId1 = createRandomString();
		const requestId2 = createRandomString();
		let capturedRequestId1: string | null = null;
		let capturedRequestId2: string | null = null;

		await runWithRequestId(requestId1, async () => {
			capturedRequestId1 = getRequestId();
		});

		await runWithRequestId(requestId2, async () => {
			capturedRequestId2 = getRequestId();
		});

		t.assert.strictEqual(capturedRequestId1, requestId1);
		t.assert.strictEqual(capturedRequestId2, requestId2);
		t.assert.notStrictEqual(capturedRequestId1, capturedRequestId2);
	});

	test("request ID is not accessible outside of its context", async (t: TestContext) => {
		const requestId = createRandomString();
		let outsideRequestId: string | null = null;

		await runWithRequestId(requestId, async () => {
			// Inside context
			t.assert.strictEqual(getRequestId(), requestId);
		});

		// Outside context
		outsideRequestId = getRequestId();
		t.assert.strictEqual(outsideRequestId, null);
	});

	test("multiple concurrent contexts work independently", async (t: TestContext) => {
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

	test("nested contexts - inner context overrides outer", async (t: TestContext) => {
		const outerRequestId = createRandomString();
		const innerRequestId = createRandomString();
		let innerCapturedRequestId: string | null = null;

		await runWithRequestId(outerRequestId, async () => {
			t.assert.strictEqual(getRequestId(), outerRequestId);

			await runWithRequestId(innerRequestId, async () => {
				innerCapturedRequestId = getRequestId();
			});
		});

		t.assert.strictEqual(innerCapturedRequestId, innerRequestId);
	});

	test("nested contexts - outer context is restored after inner completes", async (t: TestContext) => {
		const outerRequestId = createRandomString();
		const innerRequestId = createRandomString();
		let outerRequestIdAfterInner: string | null = null;

		await runWithRequestId(outerRequestId, async () => {
			t.assert.strictEqual(getRequestId(), outerRequestId);

			await runWithRequestId(innerRequestId, async () => {
				t.assert.strictEqual(getRequestId(), innerRequestId);
			});

			outerRequestIdAfterInner = getRequestId();
		});

		t.assert.strictEqual(outerRequestIdAfterInner, outerRequestId);
	});

	test("deep nesting works correctly", async (t: TestContext) => {
		const level1Id = createRandomString();
		const level2Id = createRandomString();
		const level3Id = createRandomString();
		let level3CapturedId: string | null = null;
		let level2CapturedId: string | null = null;
		let level1CapturedId: string | null = null;

		await runWithRequestId(level1Id, async () => {
			t.assert.strictEqual(getRequestId(), level1Id);

			await runWithRequestId(level2Id, async () => {
				t.assert.strictEqual(getRequestId(), level2Id);

				await runWithRequestId(level3Id, async () => {
					level3CapturedId = getRequestId();
				});

				level2CapturedId = getRequestId();
			});

			level1CapturedId = getRequestId();
		});

		t.assert.strictEqual(level3CapturedId, level3Id);
		t.assert.strictEqual(level2CapturedId, level2Id);
		t.assert.strictEqual(level1CapturedId, level1Id);
	});

	test("request ID persists across async operations within same context", async (t: TestContext) => {
		const requestId = createRandomString();
		let capturedRequestId: string | null = null;

		await runWithRequestId(requestId, async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			capturedRequestId = getRequestId();
		});

		t.assert.strictEqual(capturedRequestId, requestId);
	});

	test("request ID is maintained across await calls", async (t: TestContext) => {
		const requestId = createRandomString();
		let beforeAwaitId: string | null = null;
		let afterAwaitId: string | null = null;

		await runWithRequestId(requestId, async () => {
			beforeAwaitId = getRequestId();
			await new Promise((resolve) => setTimeout(resolve, 10));
			afterAwaitId = getRequestId();
		});

		t.assert.strictEqual(beforeAwaitId, requestId);
		t.assert.strictEqual(afterAwaitId, requestId);
	});

	test("exceptions in runWithRequestId don't leak request ID to outer context", async (t: TestContext) => {
		const requestId = createRandomString();
		let outerRequestId: string | null = null;

		try {
			await runWithRequestId(requestId, async () => {
				throw new Error("Test exception");
			});
		} catch (error) {
			// Exception caught
		}

		outerRequestId = getRequestId();
		t.assert.strictEqual(outerRequestId, null);
	});

	test("request ID is properly cleaned up after exceptions", async (t: TestContext) => {
		const requestId = createRandomString();
		let afterExceptionId: string | null = null;

		try {
			await runWithRequestId(requestId, async () => {
				t.assert.strictEqual(getRequestId(), requestId);
				throw new Error("Test exception");
			});
		} catch (error) {
			// Exception caught
		}

		afterExceptionId = getRequestId();
		t.assert.strictEqual(afterExceptionId, null);
	});

	test("synchronous functions work in runWithRequestId", async (t: TestContext) => {
		const requestId = createRandomString();
		let capturedRequestId: string | null = null;

		await runWithRequestId(requestId, () => {
			capturedRequestId = getRequestId();
			return "sync result";
		});

		t.assert.strictEqual(capturedRequestId, requestId);
	});

	test("setRequestId affects only current context", async (t: TestContext) => {
		const requestId1 = createRandomString();
		const requestId2 = createRandomString();
		let context1Id: string | null = null;
		let context2Id: string | null = null;

		await runWithRequestId(requestId1, async () => {
			setRequestId(requestId2);
			context1Id = getRequestId();
		});

		await runWithRequestId(requestId1, async () => {
			context2Id = getRequestId();
		});

		t.assert.strictEqual(context1Id, requestId2);
		t.assert.strictEqual(context2Id, requestId1);
	});
});
