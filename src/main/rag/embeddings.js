/**
 * Embeddings Module
 * Generates vector embeddings using OpenAI API
 */

const OpenAI = require('openai');

// Initialize OpenAI client
let openai = null;

function initializeOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/**
 * Generate embedding for a single text
 *
 * @param {string} text - The text to embed
 * @returns {Promise<Array>} The embedding vector
 */
async function generateEmbedding(text) {
  try {
    const client = initializeOpenAI();

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',  // Small, efficient, and cheap
      input: text
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * Includes rate limiting and error handling
 *
 * @param {Array} texts - Array of texts to embed
 * @param {Object} options - Options for batch processing
 * @returns {Promise<Array>} Array of embeddings
 */
async function generateEmbeddingsBatch(texts, options = {}) {
  const {
    batchSize = 30,      // Reduced for rate limits (40k TPM)
    delayMs = 1000       // 1 second delay between batches
  } = options;

  const embeddings = [];
  const batches = [];

  // Split into batches
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }

  console.log(`Generating embeddings for ${texts.length} texts in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const client = initializeOpenAI();

      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch
      });

      const batchEmbeddings = response.data.map(item => item.embedding);
      embeddings.push(...batchEmbeddings);

      console.log(`  Batch ${i + 1}/${batches.length} complete (${embeddings.length}/${texts.length} embeddings)`);

      // Delay between batches to avoid rate limits
      if (i < batches.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Error generating batch ${i + 1}:`, error.message);

      // If rate limited, wait and retry
      if (error.status === 429) {
        console.log('  Rate limited, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        i--;  // Retry this batch
        continue;
      }

      throw error;
    }
  }

  console.log(`✓ Generated ${embeddings.length} embeddings`);

  return embeddings;
}

/**
 * Generate embeddings for chunks (convenience function)
 *
 * @param {Array} chunks - Array of chunk objects with {text, metadata}
 * @param {Object} options - Options for batch processing
 * @returns {Promise<Array>} Chunks with embeddings added
 */
async function generateEmbeddingsForChunks(chunks, options = {}) {
  const texts = chunks.map(chunk => chunk.text);
  const embeddings = await generateEmbeddingsBatch(texts, options);

  // Add embeddings to chunks
  const chunksWithEmbeddings = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i]
  }));

  return chunksWithEmbeddings;
}

/**
 * Calculate estimated cost for embedding generation
 *
 * @param {number} tokenCount - Total number of tokens
 * @returns {Object} Cost estimate
 */
function estimateEmbeddingCost(tokenCount) {
  // text-embedding-3-small: $0.00002 per 1K tokens
  const costPerToken = 0.00002 / 1000;
  const totalCost = tokenCount * costPerToken;

  return {
    tokenCount,
    model: 'text-embedding-3-small',
    estimatedCost: totalCost,
    formattedCost: `$${totalCost.toFixed(4)}`
  };
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  generateEmbeddingsForChunks,
  estimateEmbeddingCost
};
