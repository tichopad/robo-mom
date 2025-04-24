import { pipeline } from "@huggingface/transformers";
import { logger } from "./logger.ts";

const extractorNomicV1 = await pipeline(
	"feature-extraction",
	"nomic-ai/nomic-embed-text-v1",
);

type EmbeddingVector = number[];

export async function generateEmbedding(
	input: string,
	taskInstructionPrefix?: "search_query" | "search_document",
): Promise<EmbeddingVector> {
	performance.mark("start");

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
