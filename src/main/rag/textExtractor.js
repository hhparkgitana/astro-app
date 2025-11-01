/**
 * Text Extraction Module
 * Extracts clean text from HTML and PDF astrological texts
 */

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');

/**
 * Extract metadata from filename
 * Example: "How to judge a nativity"AlanLeo.html -> { author: "Alan Leo", title: "How to judge a nativity" }
 */
function extractMetadataFromFilename(filePath) {
  const ext = path.extname(filePath);
  const filename = path.basename(filePath, ext);

  //Remove quotes
  const cleanFilename = filename.replace(/["'"]/g, '');

  // Try to extract author (usually at the end)
  let author = 'Unknown';
  let title = cleanFilename;

  // Common patterns: "TitleAuthor", "Title - Author", "Title by Author"
  const authorPatterns = [
    /(.+?)(Alan\s*Leo)/i,
    /(.+?)(Vivian\s*E?\s*Robson)/i,
    /(.+?)(William\s*Lilly)/i,
    /(.+?)(Ptolemy)/i,
    /(.+?)(by\s+(.+))$/i
  ];

  for (const pattern of authorPatterns) {
    const match = cleanFilename.match(pattern);
    if (match) {
      title = match[1].trim();
      author = match[2].replace(/^by\s+/i, '').trim();
      break;
    }
  }

  return {
    author,
    title,
    filePath,
    filename: path.basename(filePath)
  };
}

/**
 * Extract text content from HTML file
 * Archive.org HTML files have content in <pre> tags
 */
async function extractTextFromHTML(filePath) {
  try {
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // Get metadata
    const metadata = extractMetadataFromFilename(filePath);

    // Try to find title in HTML
    const htmlTitle = $('title').text();
    if (htmlTitle && htmlTitle.includes('Full text of')) {
      const titleMatch = htmlTitle.match(/Full text of "(.+)"/);
      if (titleMatch) {
        metadata.title = titleMatch[1];
      }
    }

    // Extract main content from <pre> tag (archive.org format)
    let textContent = $('pre').first().text();

    // If no <pre> tag, try getting body text
    if (!textContent || textContent.trim().length < 100) {
      // Remove scripts, styles, navigation
      $('script, style, nav, header, footer, .navigation, .sidebar').remove();
      textContent = $('body').text() || $.text();
    }

    // Clean the text
    textContent = cleanText(textContent);

    // Try to detect publication year from content
    const yearMatch = textContent.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
    if (yearMatch) {
      metadata.publicationYear = yearMatch[1];
    }

    return {
      metadata,
      text: textContent,
      wordCount: textContent.split(/\s+/).length
    };
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Clean and normalize text
 */
function cleanText(text) {
  return text
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')  // Multiple spaces to single space
    .replace(/\n\n\n+/g, '\n\n')  // Multiple newlines to double newline
    // Remove page numbers and headers
    .replace(/\n\s*\d+\s*\n/g, '\n')
    // Remove excessive special characters
    .replace(/[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]+/g, '')
    .trim();
}

/**
 * Extract text content from plain text file
 */
async function extractTextFromTXT(filePath) {
  try {
    const textContent = await fs.readFile(filePath, 'utf-8');

    // Get metadata
    const metadata = extractMetadataFromFilename(filePath);

    // Clean the text
    const cleanedText = cleanText(textContent);

    // Try to detect publication year from content
    const yearMatch = cleanedText.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
    if (yearMatch) {
      metadata.publicationYear = yearMatch[1];
    }

    return {
      metadata,
      text: cleanedText,
      wordCount: cleanedText.split(/\s+/).length
    };
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Extract text content from PDF file
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    // Get metadata
    const metadata = extractMetadataFromFilename(filePath);

    // Use PDF metadata if available
    if (data.info && data.info.Title) {
      metadata.title = data.info.Title;
    }
    if (data.info && data.info.Author) {
      metadata.author = data.info.Author;
    }
    if (data.info && data.info.CreationDate) {
      const yearMatch = data.info.CreationDate.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
      if (yearMatch) {
        metadata.publicationYear = yearMatch[1];
      }
    }

    // Clean the text
    const textContent = cleanText(data.text);

    // Try to detect publication year from content if not found in metadata
    if (!metadata.publicationYear) {
      const yearMatch = textContent.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
      if (yearMatch) {
        metadata.publicationYear = yearMatch[1];
      }
    }

    return {
      metadata,
      text: textContent,
      wordCount: textContent.split(/\s+/).length
    };
  } catch (error) {
    console.error(`Error extracting text from PDF ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Process all HTML and PDF files in a directory
 */
async function processLibraryDirectory(libraryPath) {
  try {
    const files = await fs.readdir(libraryPath);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    const txtFiles = files.filter(f => f.endsWith('.txt'));

    console.log(`Found ${htmlFiles.length} HTML files, ${pdfFiles.length} PDF files, and ${txtFiles.length} TXT files in library`);

    const results = [];

    // Process HTML files
    for (const filename of htmlFiles) {
      const filePath = path.join(libraryPath, filename);
      console.log(`Processing HTML: ${filename}...`);

      try {
        const result = await extractTextFromHTML(filePath);
        results.push(result);
        console.log(`  ✓ Extracted ${result.wordCount.toLocaleString()} words from "${result.metadata.title}"`);
      } catch (error) {
        console.error(`  ✗ Failed to process ${filename}:`, error.message);
      }
    }

    // Process PDF files
    for (const filename of pdfFiles) {
      const filePath = path.join(libraryPath, filename);
      console.log(`Processing PDF: ${filename}...`);

      try {
        const result = await extractTextFromPDF(filePath);
        results.push(result);
        console.log(`  ✓ Extracted ${result.wordCount.toLocaleString()} words from "${result.metadata.title}"`);
      } catch (error) {
        console.error(`  ✗ Failed to process ${filename}:`, error.message);
      }
    }

    // Process TXT files
    for (const filename of txtFiles) {
      const filePath = path.join(libraryPath, filename);
      console.log(`Processing TXT: ${filename}...`);

      try {
        const result = await extractTextFromTXT(filePath);
        results.push(result);
        console.log(`  ✓ Extracted ${result.wordCount.toLocaleString()} words from "${result.metadata.title}"`);
      } catch (error) {
        console.error(`  ✗ Failed to process ${filename}:`, error.message);
      }
    }

    return results;
  } catch (error) {
    console.error(`Error reading library directory ${libraryPath}:`, error.message);
    throw error;
  }
}

module.exports = {
  extractTextFromHTML,
  extractTextFromPDF,
  extractTextFromTXT,
  extractMetadataFromFilename,
  processLibraryDirectory,
  cleanText
};
