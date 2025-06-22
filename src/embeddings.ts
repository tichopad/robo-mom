import {
	type FeatureExtractionPipeline,
	pipeline,
} from "@huggingface/transformers";
import logger from "./logger.ts";

let extractorNomicV1: FeatureExtractionPipeline | null = null;

type EmbeddingVector = number[];

export async function generateEmbedding(
	input: string,
	taskInstructionPrefix?: "search_query" | "search_document",
): Promise<EmbeddingVector> {
	performance.mark("start");

	if (!extractorNomicV1) {
		logger.debug("Initializing 'nomic-ai/nomic-embed-text-v1' extractor");
		// onnx logs random shit if it can't detect the GPU
		extractorNomicV1 = await withSuppressedLogs(() => {
			return pipeline<"feature-extraction">(
				"feature-extraction",
				"nomic-ai/nomic-embed-text-v1",
			);
		});
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

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AsyncTask = (...args: any[]) => Promise<any>;

async function withSuppressedLogs<T extends AsyncTask>(
	task: T,
): Promise<ReturnType<T>> {
	const originalConsoleLog = console.log;
	const originalConsoleWarn = console.warn;
	console.log = () => {};
	console.warn = () => {};
	const result = await task();
	console.log = originalConsoleLog;
	console.warn = originalConsoleWarn;

	return result;
}
