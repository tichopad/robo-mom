import { type TestContext, describe, test } from "node:test";
import {
	getConversationId,
	runWithConversationId,
	setConversationId,
} from "#src/context/conversation-context.ts";
import { createRandomString } from "#src/utils.ts";

describe("Conversation Context", () => {
	test("getConversationId returns null when no context is set", (t: TestContext) => {
		t.assert.strictEqual(getConversationId(), null);
	});

	test("setConversationId sets the conversation ID in current context", (t: TestContext) => {
		const conversationId = createRandomString();
		setConversationId(conversationId);
		t.assert.strictEqual(getConversationId(), conversationId);
	});

	test("runWithConversationId executes function with correct conversation ID", async (t: TestContext) => {
		const conversationId = createRandomString();
		let capturedConversationId: string | null = null;

		await runWithConversationId(conversationId, async () => {
			capturedConversationId = getConversationId();
		});

		t.assert.strictEqual(capturedConversationId, conversationId);
	});

	test("runWithConversationId returns the function's result", async (t: TestContext) => {
		const conversationId = createRandomString();
		const expectedResult = "test result";

		const result = await runWithConversationId(conversationId, async () => {
			return expectedResult;
		});

		t.assert.strictEqual(result, expectedResult);
	});

	test("conversation ID is isolated between different runWithConversationId calls", async (t: TestContext) => {
		const conversationId1 = createRandomString();
		const conversationId2 = createRandomString();
		let capturedConversationId1: string | null = null;
		let capturedConversationId2: string | null = null;

		await runWithConversationId(conversationId1, async () => {
			capturedConversationId1 = getConversationId();
		});

		await runWithConversationId(conversationId2, async () => {
			capturedConversationId2 = getConversationId();
		});

		t.assert.strictEqual(capturedConversationId1, conversationId1);
		t.assert.strictEqual(capturedConversationId2, conversationId2);
		t.assert.notStrictEqual(capturedConversationId1, capturedConversationId2);
	});

	test("conversation ID is not accessible outside of its context", async (t: TestContext) => {
		const conversationId = createRandomString();
		let outsideConversationId: string | null = null;

		await runWithConversationId(conversationId, async () => {
			// Inside context
			t.assert.strictEqual(getConversationId(), conversationId);
		});

		// Outside context
		outsideConversationId = getConversationId();
		t.assert.strictEqual(outsideConversationId, null);
	});

	test("multiple concurrent contexts work independently", async (t: TestContext) => {
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

	test("nested contexts - inner context overrides outer", async (t: TestContext) => {
		const outerConversationId = createRandomString();
		const innerConversationId = createRandomString();
		let innerCapturedConversationId: string | null = null;

		await runWithConversationId(outerConversationId, async () => {
			t.assert.strictEqual(getConversationId(), outerConversationId);

			await runWithConversationId(innerConversationId, async () => {
				innerCapturedConversationId = getConversationId();
			});
		});

		t.assert.strictEqual(innerCapturedConversationId, innerConversationId);
	});

	test("nested contexts - outer context is restored after inner completes", async (t: TestContext) => {
		const outerConversationId = createRandomString();
		const innerConversationId = createRandomString();
		let outerConversationIdAfterInner: string | null = null;

		await runWithConversationId(outerConversationId, async () => {
			t.assert.strictEqual(getConversationId(), outerConversationId);

			await runWithConversationId(innerConversationId, async () => {
				t.assert.strictEqual(getConversationId(), innerConversationId);
			});

			outerConversationIdAfterInner = getConversationId();
		});

		t.assert.strictEqual(outerConversationIdAfterInner, outerConversationId);
	});

	test("deep nesting works correctly", async (t: TestContext) => {
		const level1Id = createRandomString();
		const level2Id = createRandomString();
		const level3Id = createRandomString();
		let level3CapturedId: string | null = null;
		let level2CapturedId: string | null = null;
		let level1CapturedId: string | null = null;

		await runWithConversationId(level1Id, async () => {
			t.assert.strictEqual(getConversationId(), level1Id);

			await runWithConversationId(level2Id, async () => {
				t.assert.strictEqual(getConversationId(), level2Id);

				await runWithConversationId(level3Id, async () => {
					level3CapturedId = getConversationId();
				});

				level2CapturedId = getConversationId();
			});

			level1CapturedId = getConversationId();
		});

		t.assert.strictEqual(level3CapturedId, level3Id);
		t.assert.strictEqual(level2CapturedId, level2Id);
		t.assert.strictEqual(level1CapturedId, level1Id);
	});

	test("conversation ID persists across async operations within same context", async (t: TestContext) => {
		const conversationId = createRandomString();
		let capturedConversationId: string | null = null;

		await runWithConversationId(conversationId, async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			capturedConversationId = getConversationId();
		});

		t.assert.strictEqual(capturedConversationId, conversationId);
	});

	test("conversation ID is maintained across await calls", async (t: TestContext) => {
		const conversationId = createRandomString();
		let beforeAwaitId: string | null = null;
		let afterAwaitId: string | null = null;

		await runWithConversationId(conversationId, async () => {
			beforeAwaitId = getConversationId();
			await new Promise((resolve) => setTimeout(resolve, 10));
			afterAwaitId = getConversationId();
		});

		t.assert.strictEqual(beforeAwaitId, conversationId);
		t.assert.strictEqual(afterAwaitId, conversationId);
	});

	test("exceptions in runWithConversationId don't leak conversation ID to outer context", async (t: TestContext) => {
		const conversationId = createRandomString();
		let outerConversationId: string | null = null;

		try {
			await runWithConversationId(conversationId, async () => {
				throw new Error("Test exception");
			});
		} catch (error) {
			// Exception caught
		}

		outerConversationId = getConversationId();
		t.assert.strictEqual(outerConversationId, null);
	});

	test("conversation ID is properly cleaned up after exceptions", async (t: TestContext) => {
		const conversationId = createRandomString();
		let afterExceptionId: string | null = null;

		try {
			await runWithConversationId(conversationId, async () => {
				t.assert.strictEqual(getConversationId(), conversationId);
				throw new Error("Test exception");
			});
		} catch (error) {
			// Exception caught
		}

		afterExceptionId = getConversationId();
		t.assert.strictEqual(afterExceptionId, null);
	});

	test("synchronous functions work in runWithConversationId", async (t: TestContext) => {
		const conversationId = createRandomString();
		let capturedConversationId: string | null = null;

		await runWithConversationId(conversationId, () => {
			capturedConversationId = getConversationId();
			return "sync result";
		});

		t.assert.strictEqual(capturedConversationId, conversationId);
	});

	test("setConversationId affects only current context", async (t: TestContext) => {
		const conversationId1 = createRandomString();
		const conversationId2 = createRandomString();
		let context1Id: string | null = null;
		let context2Id: string | null = null;

		await runWithConversationId(conversationId1, async () => {
			setConversationId(conversationId2);
			context1Id = getConversationId();
		});

		await runWithConversationId(conversationId1, async () => {
			context2Id = getConversationId();
		});

		t.assert.strictEqual(context1Id, conversationId2);
		t.assert.strictEqual(context2Id, conversationId1);
	});
});
