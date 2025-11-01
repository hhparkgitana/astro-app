/**
 * Text Chunking Module
 * Splits text into overlapping chunks for better context preservation
 */

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Get last N tokens from text
 */
function getLastNTokens(text, n) {
  const approxChars = n * 4;
  return text.slice(-approxChars);
}

/**
 * Split text into sentences (rough approximation)
 */
function splitIntoSentences(text) {
  // Split on sentence endings, but keep the punctuation
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

/**
 * Chunk text with overlap
 *
 * @param {string} text - The text to chunk
 * @param {Object} metadata - Metadata about the source
 * @param {Object} options - Chunking options
 * @returns {Array} Array of chunks with metadata
 */
function chunkText(text, metadata, options = {}) {
  const {
    chunkSize = 800,           // Target tokens per chunk
    overlap = 100,              // Overlap between chunks for context
    preserveParagraphs = true   // Try to keep paragraphs together
  } = options;

  const chunks = [];

  // Split into paragraphs first
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  let currentChunk = '';
  let currentTokenCount = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If this single paragraph is too large, split it by sentences
    if (paragraphTokens > chunkSize * 1.5) {
      // Save current chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push(createChunk(currentChunk.trim(), metadata, chunkIndex++));

        // Reset with overlap
        const overlapText = getLastNTokens(currentChunk, overlap);
        currentChunk = overlapText;
        currentTokenCount = overlap;
      }

      // Split large paragraph by sentences
      const sentences = splitIntoSentences(paragraph);
      let sentenceBuffer = '';
      let sentenceTokens = 0;

      for (const sentence of sentences) {
        const sentenceTokenCount = estimateTokens(sentence);

        if (sentenceTokens + sentenceTokenCount > chunkSize && sentenceBuffer.length > 0) {
          // Save sentence buffer as chunk
          chunks.push(createChunk(sentenceBuffer.trim(), metadata, chunkIndex++));

          // Start new buffer with overlap
          const overlapText = getLastNTokens(sentenceBuffer, overlap);
          sentenceBuffer = overlapText + ' ' + sentence;
          sentenceTokens = overlap + sentenceTokenCount;
        } else {
          sentenceBuffer += ' ' + sentence;
          sentenceTokens += sentenceTokenCount;
        }
      }

      // Add remaining sentence buffer to current chunk
      if (sentenceBuffer.trim().length > 0) {
        currentChunk = sentenceBuffer.trim();
        currentTokenCount = sentenceTokens;
      }

      continue;
    }

    // Check if adding this paragraph exceeds chunk size
    if (currentTokenCount + paragraphTokens > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(createChunk(currentChunk.trim(), metadata, chunkIndex++));

      // Start new chunk with overlap (last part of previous chunk)
      const overlapText = getLastNTokens(currentChunk, overlap);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentTokenCount = overlap + paragraphTokens;
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
      currentTokenCount += paragraphTokens;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(createChunk(currentChunk.trim(), metadata, chunkIndex++));
  }

  console.log(`  Created ${chunks.length} chunks (avg ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length)} tokens/chunk)`);

  return chunks;
}

/**
 * Create a chunk object with metadata
 */
function createChunk(text, metadata, chunkIndex) {
  return {
    text,
    metadata: {
      ...metadata,
      chunkIndex,
      tokenCount: estimateTokens(text),
      wordCount: text.split(/\s+/).length
    }
  };
}

/**
 * Chunk multiple documents
 *
 * @param {Array} documents - Array of {text, metadata} objects
 * @param {Object} options - Chunking options
 * @returns {Array} Array of all chunks from all documents
 */
function chunkDocuments(documents, options = {}) {
  const allChunks = [];

  for (const doc of documents) {
    const chunks = chunkText(doc.text, doc.metadata, options);
    allChunks.push(...chunks);
  }

  console.log(`Total chunks created: ${allChunks.length}`);

  return allChunks;
}

module.exports = {
  chunkText,
  chunkDocuments,
  estimateTokens,
  splitIntoSentences
};
