/**
 * Test script to index the library and verify RAG system
 */

require('dotenv').config();
const rag = require('./index');

async function test() {
  try {
    console.log('Testing RAG system...\n');

    // Index the library
    console.log('=== INDEXING LIBRARY ===');
    const result = await rag.indexLibrary({ forceReindex: true });

    console.log('\nIndexing result:', result);

    // Get stats
    console.log('\n=== LIBRARY STATS ===');
    const stats = await rag.getLibraryStats();
    console.log(stats);

    // Test queries
    console.log('\n=== TESTING QUERIES ===');

    const testQueries = [
      'What does Saturn in the 7th house mean?',
      'How do I interpret Moon square Pluto?',
      'What is the significance of Jupiter in the 10th house?'
    ];

    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      const passages = await rag.queryTexts(query, { nResults: 3 });

      console.log(`Found ${passages.length} relevant passages:`);
      passages.forEach((p, i) => {
        console.log(`\n  ${i + 1}. ${p.author} - "${p.title}" (${p.year})`);
        console.log(`     Similarity: ${p.similarity}`);
        console.log(`     ${p.text.substring(0, 150)}...`);
      });
    }

    console.log('\n✓ Test complete!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();
