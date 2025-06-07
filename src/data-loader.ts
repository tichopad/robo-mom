import fs from "node:fs/promises";
import path from "node:path";
import { extract as extractFrontmatter } from "@std/front-matter/any";
import { test as testFrontmatter } from "@std/front-matter/test";
import { chunkMarkdown } from "./chunk-text.ts";
import { db } from "./db/client.ts";
import { notesTable } from "./db/schema.ts";
import { generateEmbedding } from "./embeddings.ts";
import { logger } from "./logger.ts";

export async function loadMarkdownFilesFromGlob(
	globPath: string | string[],
): Promise<void> {
	logger.debug("Loading Markdown files from glob: %s", globPath);

	let count = 0;

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

		await loadMarkdownFileToDb(file);
		count++;
	}

	logger.debug("Loaded %d Markdown files", count);
}

export async function loadMarkdownFileToDb(filePath: string): Promise<void> {
	logger.debug("Loading Markdown file: %s", filePath);
	const fileContent = await fs.readFile(filePath, { encoding: "utf-8" });
	const { attrs, body } = extractAttrsAndBody(fileContent);

	const bodyChunks = chunkMarkdown(body, 12_000);

	logger.debug(
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
			frontmatter_attributes: attrs,
		});

		logger.debug("Inserted chunk %d of %s into database", chunkIndex, filePath);

		chunkIndex++;
	}
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
