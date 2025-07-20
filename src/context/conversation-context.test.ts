import { type TestContext, describe, test } from "node:test";
import {
	getConversationId,
	runWithConversationId,
} from "#src/context/conversation-context.ts";
import { createRandomString } from "#src/utils.ts";

describe("Conversation Context", () => {
	test("getConversationId returns null when no context is set", (t: TestContext) => {
		t.assert.strictEqual(getConversationId(), null);
	});

	test("runWithConversationId executes function with correct conversation ID and returns result", (t: TestContext) => {
		const conversationId = createRandomString();
		const expectedResult = "test result";

		const result = runWithConversationId(conversationId, () => {
			t.assert.strictEqual(getConversationId(), conversationId);
			return expectedResult;
		});

		t.assert.strictEqual(result, expectedResult);
	});

	test("conversation ID is isolated between different contexts", (t: TestContext) => {
		const conversationId1 = createRandomString();
		const conversationId2 = createRandomString();

		const result1 = runWithConversationId(conversationId1, () =>
			getConversationId(),
		);
		const result2 = runWithConversationId(conversationId2, () =>
			getConversationId(),
		);

		t.assert.strictEqual(result1, conversationId1);
		t.assert.strictEqual(result2, conversationId2);
		t.assert.notStrictEqual(result1, result2);
	});

	test("multiple concurrent contexts work independently with async operations", async (t: TestContext) => {
		const conversationId1 = createRandomString();
		const conversationId2 = createRandomString();
		const conversationId3 = createRandomString();

		const promises = [
			runWithConversationId(conversationId1, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return getConversationId();
			}),
			runWithConversationId(conversationId2, async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return getConversationId();
			}),
			runWithConversationId(conversationId3, async () => {
				await new Promise((resolve) => setTimeout(resolve, 15));
				return getConversationId();
			}),
		];

		const results = await Promise.all(promises);

		t.assert.strictEqual(results[0], conversationId1);
		t.assert.strictEqual(results[1], conversationId2);
		t.assert.strictEqual(results[2], conversationId3);
	});

	test("nested contexts behave correctly", async (t: TestContext) => {
		const outerConversationId = createRandomString();
		const innerConversationId = createRandomString();
		let outerIdAfterInner: string | null = null;

		await runWithConversationId(outerConversationId, async () => {
			t.assert.strictEqual(getConversationId(), outerConversationId);

			await runWithConversationId(innerConversationId, async () => {
				t.assert.strictEqual(getConversationId(), innerConversationId);
			});

			// Outer context should be restored after inner completes
			outerIdAfterInner = getConversationId();
		});

		t.assert.strictEqual(outerIdAfterInner, outerConversationId);
	});

	test("conversation ID is not accessible outside of its context", (t: TestContext) => {
		const conversationId = createRandomString();

		runWithConversationId(conversationId, () => {
			t.assert.strictEqual(getConversationId(), conversationId);
		});

		// Should be null outside the context
		t.assert.strictEqual(getConversationId(), null);
	});

	test("exceptions are properly handled and context is cleaned up", async (t: TestContext) => {
		const conversationId = createRandomString();
		const testError = new Error("Test exception");

		await t.assert.rejects(
			runWithConversationId(conversationId, async () => {
				t.assert.strictEqual(getConversationId(), conversationId);
				throw testError;
			}),
			testError,
		);

		// Context should be cleaned up after exception
		t.assert.strictEqual(getConversationId(), null);
	});

	test("synchronous exceptions are properly handled", (t: TestContext) => {
		const conversationId = createRandomString();
		const testError = new Error("Sync test exception");

		t.assert.throws(() => {
			runWithConversationId(conversationId, () => {
				throw testError;
			});
		}, testError);

		t.assert.strictEqual(getConversationId(), null);
	});

	test("works with empty string conversation ID", (t: TestContext) => {
		const emptyId = "";

		const result = runWithConversationId(emptyId, () => {
			return getConversationId();
		});

		t.assert.strictEqual(result, emptyId);
	});

	test("supports both sync and async functions", async (t: TestContext) => {
		const conversationId = createRandomString();

		// Test sync function
		const syncResult = runWithConversationId(conversationId, () => {
			return getConversationId();
		});

		// Test async function
		const asyncResult = await runWithConversationId(
			conversationId,
			async () => {
				await new Promise((resolve) => setTimeout(resolve, 1));
				return getConversationId();
			},
		);

		t.assert.strictEqual(syncResult, conversationId);
		t.assert.strictEqual(asyncResult, conversationId);
	});
});
