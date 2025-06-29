import { extract as extractFrontmatter } from "@std/front-matter/any";
import { test as testFrontmatter } from "@std/front-matter/test";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { chunkMarkdown } from "./chunk-text.ts";
import { db } from "./db/client.ts";
import { notesTable } from "./db/schema.ts";
import { generateEmbedding } from "./embeddings.ts";
import { logger } from "./logger.ts";
import { performance } from "node:perf_hooks";

export async function loadMarkdownFilesFromGlob(
	globPath: string | string[],
): Promise<void> {
	logger.debug("Loading Markdown files from glob: %s", globPath);

	let count = 0;
	let skipped = 0;

	for await (const file of fs.glob(globPath)) {
		const fileStat = await fs.stat(file);

		if (fileStat.isDirectory()) {
			logger.debug("Skipping directory: %s", file);
			continue;
		}
		if (path.extname(file) !== ".md") {
			logger.debug("Skipping non-markdown file: %s", file);
			continue;
		}

		const wasProcessed = await loadMarkdownFileToDb(file);
		if (wasProcessed) {
			count++;
		} else {
			skipped++;
		}
	}

	logger.info(
		"Loaded %d Markdown files, skipped %d unchanged files",
		count,
		skipped,
	);
}

/**
 * Loads a Markdown file into the database.
 *
 * @param filePath - The path to the Markdown file.
 * @returns `true` if the file was loaded, `false` if it was skipped.
 */
export async function loadMarkdownFileToDb(filePath: string): Promise<boolean> {
	logger.debug("Processing Markdown file: %s", filePath);

	// Read file content and calculate checksum
	const fileContent = await fs.readFile(filePath, { encoding: "utf-8" });
	const checksum = calculateSHA256(fileContent);

	// Check if file already exists in database with the same checksum
	const existingNotes = await db
		.select({ checksum: notesTable.checksum })
		.from(notesTable)
		.where(eq(notesTable.filename, filePath))
		.limit(1);

	if (existingNotes.length > 0 && existingNotes[0]?.checksum === checksum) {
		logger.debug("File %s unchanged (checksum match), skipping", filePath);
		return false;
	}

	// If checksum doesn't match or file doesn't exist, remove old entries and process
	if (existingNotes.length > 0) {
		logger.debug(
			"File %s changed (checksum mismatch), removing old entries",
			filePath,
		);
		await db.delete(notesTable).where(eq(notesTable.filename, filePath));
	}

	logger.debug("Loading Markdown file: %s", filePath);
	const { attrs, body } = extractAttrsAndBody(fileContent);

	const bodyChunks = chunkMarkdown(body, 12_000);

	logger.info(
		"Chunked markdown file: %s (%d chunks)",
		filePath,
		bodyChunks.length,
	);

	let chunkIndex = 0;
	for (const chunk of bodyChunks) {
		logger.debug(
			"Generating embeddings for chunk %d of %s",
			chunkIndex,
			filePath,
		);
		const contentEmbedding = await generateEmbedding(chunk.content);
		logger.debug(
			"Generated embeddings for chunk %d of %s",
			chunkIndex,
			filePath,
		);
		const filePathEmbedding = await generateEmbedding(
			filePath,
			"search_document",
		);

		await db.insert(notesTable).values({
			filename: filePath,
			chunk_index: chunkIndex,
			text: chunk.content,
			text_vector: contentEmbedding,
			filename_vector: filePathEmbedding,
			checksum: checksum,
			frontmatter_attributes: attrs,
		});

		logger.debug("Inserted chunk %d of %s into database", chunkIndex, filePath);

		chunkIndex++;
	}

	return true;
}

function calculateSHA256(content: string): string {
	const start = performance.now();
	const sha256 = createHash("sha256").update(content, "utf8").digest("hex");
	const end = performance.now();
	logger.debug(
		"calculateSHA256 for %s took %dms",
		content.slice(0, 10),
		end - start,
	);
	return sha256;
}

type ExtractResult = {
	attrs: Record<string, unknown> | null;
	body: string;
};

function extractAttrsAndBody(fileContent: string): ExtractResult {
	const hasFrontmatter = testFrontmatter(fileContent);

	if (!hasFrontmatter) {
		return {
			attrs: null,
			body: fileContent.trim(),
		};
	}

	const extracted = extractFrontmatter<ExtractResult["attrs"]>(fileContent);

	return {
		attrs: extracted.attrs,
		body: extracted.body.trim(),
	};
}
