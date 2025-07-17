#!/usr/bin/env node

import {
	getRequestId,
	runWithRequestId,
} from "#src/context/request-context.ts";
import { logger } from "#src/logger.ts";
import { createRandomString } from "#src/utils.ts";

/**
 * Test script to verify request ID tracking functionality.
 */
async function testRequestIdTracking() {
	console.log("Testing request ID tracking...\n");

	// Test 1: Log outside of request context (should have null requestId)
	console.log("Test 1: Logging outside request context");
	logger.info("This log should have null requestId");
	console.log("Current request ID:", getRequestId());
	console.log();

	// Test 2: Log within request context (should have requestId)
	console.log("Test 2: Logging within request context");
	const testRequestId = createRandomString();
	console.log("Generated request ID:", testRequestId);

	await runWithRequestId(testRequestId, async () => {
		console.log("Current request ID in context:", getRequestId());
		logger.info("This log should have the request ID");
		logger.debug("Another log with the same request ID");
		logger.error("Error log with request ID", { error: "test error" });
	});

	// Test 3: Log outside context again (should be null again)
	console.log("\nTest 3: Logging outside request context again");
	logger.info("This log should have null requestId again");
	console.log("Current request ID:", getRequestId());

	// Test 4: Nested contexts
	console.log("\nTest 4: Nested request contexts");
	const outerRequestId = createRandomString();
	const innerRequestId = createRandomString();

	await runWithRequestId(outerRequestId, async () => {
		console.log("Outer context request ID:", getRequestId());
		logger.info("Log in outer context");

		await runWithRequestId(innerRequestId, async () => {
			console.log("Inner context request ID:", getRequestId());
			logger.info("Log in inner context");
		});

		console.log("Back to outer context request ID:", getRequestId());
		logger.info("Log back in outer context");
	});

	console.log("\nRequest ID tracking test completed!");
}

// Run the test
testRequestIdTracking().catch(console.error);
