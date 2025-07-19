/**
 * Given input text and a character limit, splits the text into sizeable chunks.
 * If overlap's provided, chunks overlap by a number of characters
 *
 * @param text - The text to chunk.
 * @param charLimit - The maximum number of characters per chunk.
 * @param overlap - The number of characters to overlap between chunks.
 * @returns An array of chunks.
 */
function chunkText(text: string, charLimit: number, overlap = 0): string[] {
	if (text.trim().length === 0) return [];
	if (text.length <= charLimit) return [text];

	const endIndex = text.length > charLimit ? charLimit : text.length;
	const firstChunk = text.slice(0, endIndex);

	const endIndexWithOverlap = endIndex - overlap <= 0 ? 0 : endIndex - overlap;
	const rest = text.slice(endIndexWithOverlap);

	return [firstChunk, ...chunkText(rest, charLimit, overlap)];
}

type Chunk = {
	content: string; // Chunk text content
	index: number; // Index of the chunk in the processing sequence
};

/**
 * Chunks markdown text into smaller chunks isolated semantically.
 *
 * @param text - The markdown text to chunk.
 * @param charLimit - The maximum number of characters per chunk.
 * @returns An array of chunks.
 */
export function chunkMarkdown(text: string, charLimit: number): Chunk[] {
	// If text fits in character limit, return it as a single chunk
	if (text.length <= charLimit) {
		return [{ content: text, index: 0 }];
	}

	// Separators in order of preference
	const separators = [
		/(?=^# )/m, // Header level 1
		/(?=^## )/m, // Header level 2
		/(?=^### )/m, // Header level 3
		/(?=^#### )/m, // Header level 4
		/(?=^##### )/m, // Header level 5
		/(?=^###### )/m, // Header level 6
		/\n\n/, // Paragraph breaks
		/\n/, // Line breaks
		/\. /, // Sentence breaks
	];

	// Try to chunk by each separator in order
	for (const separator of separators) {
		const segments = text.split(separator).filter((s) => s.trim().length > 0);

		// If there's only one segment or all segments are too large, proceed to the next separator
		if (segments.length === 1 || segments.every((s) => s.length > charLimit)) {
			continue;
		}

		// Process the segments
		const chunks: Chunk[] = [];
		let currentChunk = "";
		let currentIndex = 0;

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			const isHeaderSeparator = separator.toString().includes("^");
			const separatorStr = isHeaderSeparator
				? ""
				: separator
						.toString()
						.replace(/\\/g, "")
						.replace(/\(\?=|\)/g, "");

			// Add separator to segment except for the first one
			const segmentWithSeparator =
				i === 0 || isHeaderSeparator ? segment : separatorStr + segment;

			// If adding this segment exceeds the limit and we already have content
			if (
				currentChunk.length + (segmentWithSeparator?.length ?? 0) > charLimit &&
				currentChunk.length > 0
			) {
				chunks.push({ content: currentChunk, index: currentIndex++ });
				currentChunk = segmentWithSeparator ?? "";
			}
			// If this segment alone exceeds the limit, recursively chunk it
			else if ((segmentWithSeparator?.length ?? 0) > charLimit) {
				// First add the current chunk if it exists
				if (currentChunk.length > 0) {
					chunks.push({ content: currentChunk, index: currentIndex++ });
					currentChunk = "";
				}

				// Recursively chunk the oversized segment
				const subChunks = chunkMarkdown(segmentWithSeparator ?? "", charLimit);
				for (const subChunk of subChunks) {
					chunks.push({ content: subChunk.content, index: currentIndex++ });
				}
			}
			// Otherwise add to current chunk
			else {
				if (currentChunk.length > 0 && i > 0 && !isHeaderSeparator) {
					currentChunk += separatorStr;
				}
				currentChunk += segment;
			}
		}

		// Add the last chunk if there's anything left
		if (currentChunk.length > 0) {
			chunks.push({ content: currentChunk, index: currentIndex++ });
		}

		return chunks;
	}

	// If we've tried all separators and still can't chunk properly,
	// fall back to character limit chunking
	return chunkText(text, charLimit).map((content, index) => ({
		content,
		index,
	}));
}
