/**
 * Vector Store Module
 * Manages Vectra for storing and retrieving embeddings
 */

const { LocalIndex } = require('vectra');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '../../..', 'vector_index');

let index = null;

/**
 * Initialize Vectra index
 *
 * @param {Object} options - Configuration options
 * @returns {Promise<LocalIndex>} The initialized index
 */
async function initializeIndex(options = {}) {
  if (!index) {
    const { indexPath } = options;

    index = new LocalIndex(indexPath || INDEX_PATH);

    // Create index if it doesn't exist
    if (!(await index.isIndexCreated())) {
      await index.createIndex();
      console.log('Created new vector index');
    }
  }

  return index;
}

/**
 * Add chunks to the vector store
 *
 * @param {Array} chunks - Array of chunks with {text, metadata, embedding}
 * @returns {Promise<void>}
 */
async function addChunks(chunks) {
  const idx = await initializeIndex();

  // Add each chunk to the index
  for (const chunk of chunks) {
    const itemId = `${chunk.metadata.author.replace(/\s+/g, '_')}_${chunk.metadata.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_chunk_${chunk.metadata.chunkIndex}_${Date.now()}`;

    await idx.insertItem({
      vector: chunk.embedding,
      metadata: {
        id: itemId,
        text: chunk.text,
        author: chunk.metadata.author,
        title: chunk.metadata.title,
        filename: chunk.metadata.filename,
        chunkIndex: chunk.metadata.chunkIndex,
        tokenCount: chunk.metadata.tokenCount,
        publicationYear: chunk.metadata.publicationYear || 'unknown'
      }
    });
  }

  console.log(`✓ Added ${chunks.length} chunks to vector store`);
}

/**
 * Query the vector store for similar passages
 *
 * @param {Array} queryEmbedding - The query embedding vector
 * @param {number} nResults - Number of results to return
 * @param {Object} filter - Optional metadata filter (not used in Vectra)
 * @returns {Promise<Array>} Array of relevant passages with metadata
 */
async function query(queryEmbedding, nResults = 5, filter = null) {
  const idx = await initializeIndex();

  try {
    const results = await idx.queryItems(queryEmbedding, nResults);

    // Format results
    const passages = results.map(result => ({
      text: result.item.metadata.text,
      metadata: {
        author: result.item.metadata.author,
        title: result.item.metadata.title,
        filename: result.item.metadata.filename,
        chunkIndex: result.item.metadata.chunkIndex,
        tokenCount: result.item.metadata.tokenCount,
        publicationYear: result.item.metadata.publicationYear
      },
      distance: 1 - result.score,  // Vectra returns score (higher is better)
      similarity: result.score  // Score is already a similarity measure
    }));

    return passages;
  } catch (error) {
    console.error('Error querying vector store:', error.message);
    throw error;
  }
}

/**
 * Get collection statistics
 *
 * @returns {Promise<Object>} Collection statistics
 */
async function getStats() {
  const idx = await initializeIndex();

  try {
    const items = await idx.listItems();

    // Analyze metadata
    const authors = new Set();
    const titles = new Set();

    items.forEach(item => {
      if (item.metadata.author) authors.add(item.metadata.author);
      if (item.metadata.title) titles.add(item.metadata.title);
    });

    return {
      totalChunks: items.length,
      uniqueAuthors: authors.size,
      uniqueTitles: titles.size,
      authors: Array.from(authors),
      titles: Array.from(titles)
    };
  } catch (error) {
    console.error('Error getting collection stats:', error.message);
    throw error;
  }
}

/**
 * Delete the index (for re-indexing)
 *
 * @returns {Promise<void>}
 */
async function deleteCollection() {
  try {
    const idx = await initializeIndex();
    await idx.deleteIndex();
    index = null;
    console.log('Deleted vector index');
  } catch (error) {
    console.error('Error deleting index:', error.message);
    throw error;
  }
}

/**
 * Check if index exists and has data
 *
 * @returns {Promise<boolean>} True if index exists with data
 */
async function hasData() {
  try {
    const idx = await initializeIndex();
    if (!(await idx.isIndexCreated())) {
      return false;
    }
    const items = await idx.listItems();
    return items.length > 0;
  } catch (error) {
    return false;
  }
}

module.exports = {
  initializeIndex,
  addChunks,
  query,
  getStats,
  deleteCollection,
  hasData
};
