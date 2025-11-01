/**
 * RAG System - Main Orchestrator
 * Coordinates text processing, embedding generation, and vector storage
 */

const path = require('path');
const { processLibraryDirectory } = require('./textExtractor');
const { chunkDocuments } = require('./textChunker');
const { generateEmbeddingsForChunks, estimateEmbeddingCost } = require('./embeddings');
const vectorStore = require('./vectorStore');
const { generateEmbedding } = require('./embeddings');

// Default library path
const DEFAULT_LIBRARY_PATH = path.join(__dirname, '../../../', 'Texts for RAG');

/**
 * Index the astrological text library
 * Main pipeline: Extract → Chunk → Embed → Store
 *
 * @param {Object} options - Indexing options
 * @returns {Promise<Object>} Indexing results
 */
async function indexLibrary(options = {}) {
  const {
    libraryPath = DEFAULT_LIBRARY_PATH,
    forceReindex = false,
    chunkSize = 800,
    overlap = 100
  } = options;

  console.log('\n=== RAG Library Indexing Started ===\n');
  console.log(`Library path: ${libraryPath}`);

  try {
    // Check if already indexed
    if (!forceReindex && await vectorStore.hasData()) {
      const stats = await vectorStore.getStats();
      console.log('\n✓ Library already indexed');
      console.log(`  Total chunks: ${stats.totalChunks}`);
      console.log(`  Books: ${stats.uniqueTitles}`);
      console.log(`  Authors: ${stats.authors.join(', ')}`);
      return {
        success: true,
        alreadyIndexed: true,
        stats
      };
    }

    // Clear existing collection if force re-indexing
    if (forceReindex) {
      console.log('Force re-indexing: Clearing existing collection...');
      await vectorStore.deleteCollection();
    }

    // Step 1: Extract text from HTML files
    console.log('\nStep 1: Extracting text from HTML files...');
    const extractedDocs = await processLibraryDirectory(libraryPath);

    if (extractedDocs.length === 0) {
      throw new Error('No HTML files found in library directory');
    }

    const totalWords = extractedDocs.reduce((sum, doc) => sum + doc.wordCount, 0);
    console.log(`\n✓ Extracted ${totalWords.toLocaleString()} total words from ${extractedDocs.length} books`);

    // Step 2: Chunk the texts
    console.log('\nStep 2: Chunking texts...');
    const chunks = chunkDocuments(extractedDocs, { chunkSize, overlap });

    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.metadata.tokenCount, 0);
    console.log(`\n✓ Created ${chunks.length} chunks (${totalTokens.toLocaleString()} total tokens)`);

    // Estimate cost
    const costEstimate = estimateEmbeddingCost(totalTokens);
    console.log(`\nEstimated embedding cost: ${costEstimate.formattedCost}`);

    // Step 3: Generate embeddings
    console.log('\nStep 3: Generating embeddings...');
    const chunksWithEmbeddings = await generateEmbeddingsForChunks(chunks);

    // Step 4: Store in vector database
    console.log('\nStep 4: Storing in vector database...');
    await vectorStore.addChunks(chunksWithEmbeddings);

    // Get final stats
    const stats = await vectorStore.getStats();

    console.log('\n=== Indexing Complete ===');
    console.log(`Total chunks: ${stats.totalChunks}`);
    console.log(`Books indexed: ${stats.titles.join(', ')}`);
    console.log(`Authors: ${stats.authors.join(', ')}`);

    return {
      success: true,
      stats,
      booksProcessed: extractedDocs.length,
      chunksCreated: chunks.length,
      totalTokens,
      estimatedCost: costEstimate.formattedCost
    };
  } catch (error) {
    console.error('\n❌ Indexing failed:', error.message);
    throw error;
  }
}

/**
 * Query the RAG system for relevant passages
 *
 * @param {string} query - The user's question
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Relevant passages with citations
 */
async function queryTexts(query, options = {}) {
  const {
    nResults = 5,
    minSimilarity = 0.5  // Minimum similarity threshold
  } = options;

  try {
    // Check if library is indexed
    if (!await vectorStore.hasData()) {
      throw new Error('Library not indexed. Please run indexLibrary() first.');
    }

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Search vector database
    const results = await vectorStore.query(queryEmbedding, nResults);

    // Filter by similarity threshold
    const filteredResults = results.filter(r => r.similarity >= minSimilarity);

    // Format for citation
    const passages = filteredResults.map(result => ({
      text: result.text,
      author: result.metadata.author,
      title: result.metadata.title,
      year: result.metadata.publicationYear,
      similarity: result.similarity.toFixed(3),
      chunkIndex: result.metadata.chunkIndex
    }));

    return passages;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

/**
 * Get library statistics
 *
 * @returns {Promise<Object>} Library stats
 */
async function getLibraryStats() {
  try {
    if (!await vectorStore.hasData()) {
      return {
        indexed: false,
        totalChunks: 0,
        books: [],
        authors: []
      };
    }

    const stats = await vectorStore.getStats();

    return {
      indexed: true,
      totalChunks: stats.totalChunks,
      books: stats.titles,
      authors: stats.authors,
      uniqueBooks: stats.uniqueTitles,
      uniqueAuthors: stats.uniqueAuthors
    };
  } catch (error) {
    console.error('Error getting stats:', error.message);
    throw error;
  }
}

/**
 * Check if library is ready for queries
 *
 * @returns {Promise<boolean>} True if ready
 */
async function isReady() {
  return await vectorStore.hasData();
}

module.exports = {
  indexLibrary,
  queryTexts,
  getLibraryStats,
  isReady,
  DEFAULT_LIBRARY_PATH
};
