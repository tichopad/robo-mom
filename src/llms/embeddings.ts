import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { logger } from "#src/logger.ts";

let extractorNomicV1: FeatureExtractionPipeline | null = null;

async function getExtractor() {
	if (extractorNomicV1) {
		logger.debug(
			"'nomic-ai/nomic-embed-text-v1' extractor already initialized",
		);
		return extractorNomicV1;
	}

	const start = performance.now();
	logger.debug("Initializing 'nomic-ai/nomic-embed-text-v1' extractor");

	const { pipeline } = await import("@huggingface/transformers");
	extractorNomicV1 = await pipeline<"feature-extraction">(
		"feature-extraction",
		"nomic-ai/nomic-embed-text-v1",
		{ dtype: "fp32" },
	);

	const end = performance.now();
	logger.debug(
		"'nomic-ai/nomic-embed-text-v1' extractor initialized in %d ms",
		end - start,
	);

	return extractorNomicV1;
}

type EmbeddingVector = number[];

export async function generateEmbedding(
	input: string,
	taskInstructionPrefix?: "search_query" | "search_document",
): Promise<EmbeddingVector> {
	performance.mark("start");

	const extractor = await getExtractor();
	const prefix = taskInstructionPrefix ? `${taskInstructionPrefix}: ` : "";
	const embeddings = await extractor([`${prefix}${input}`], {
		pooling: "mean",
		normalize: true,
	});
	const flatEmbeddings = embeddings.tolist().flat();

	const elapsed = performance.measure("end", "start");
	logger.debug(
		"Embedding generation (using 'nomic-ai/nomic-embed-text-v1') took: %d ms",
		Math.floor(elapsed.duration),
	);

	return flatEmbeddings;
}
