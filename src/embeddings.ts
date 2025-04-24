import {
	type FeatureExtractionPipeline,
	pipeline,
} from "@huggingface/transformers";
import { logger } from "./logger.ts";

let extractorNomicV1: FeatureExtractionPipeline | null = null;

type EmbeddingVector = number[];

export async function generateEmbedding(
	input: string,
	taskInstructionPrefix?: "search_query" | "search_document",
): Promise<EmbeddingVector> {
	performance.mark("start");

	if (!extractorNomicV1) {
		logger.debug("Initializing 'nomic-ai/nomic-embed-text-v1' extractor");
		extractorNomicV1 = await pipeline<"feature-extraction">(
			"feature-extraction",
			"nomic-ai/nomic-embed-text-v1",
		);
	} else {
		logger.debug(
			"'nomic-ai/nomic-embed-text-v1' extractor already initialized",
		);
	}

	const prefix = taskInstructionPrefix ? `${taskInstructionPrefix}: ` : "";
	const embeddings = await extractorNomicV1([`${prefix}${input}`], {
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
