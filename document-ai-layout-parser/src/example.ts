/**
 * Example usage of Document AI Layout Parser
 * This demonstrates how to use the parser in your own code
 */

// Load environment variables from .env file
import 'dotenv/config';

import { LayoutParser } from './layout-parser';
import { LayoutParserConfig } from './types';
import { convertToMarkdown, convertToPlainMarkdown } from './markdown-converter';
import * as fs from 'fs';

/**
 * Example 1: Basic usage with file path
 */
async function example1() {
  console.log('Example 1: Basic Document Processing\n');

  const config: LayoutParserConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
    location: 'us',
    processorId: process.env.DOCUMENTAI_PROCESSOR_ID || 'your-processor-id',
    processorVersion: 'pretrained-layout-parser-v1.5-pro-2025-08-25',
  };

  const parser = new LayoutParser(config);

  try {
    // Process a document
    const result = await parser.processDocument('./sample.pdf', {
      extractTables: true,
      extractTextBlocks: true,
      minConfidence: 0.5,
    });

    console.log(`Pages: ${result.pageCount}`);
    console.log(`Text blocks: ${result.textBlocks.length}`);
    console.log(`Tables: ${result.tables.length}`);

    // Print first few text blocks
    result.textBlocks.slice(0, 3).forEach((block, i) => {
      console.log(`\nBlock ${i + 1}:`);
      console.log(`  Type: ${block.type}`);
      console.log(`  Confidence: ${(block.confidence * 100).toFixed(1)}%`);
      console.log(`  Text: ${block.text.substring(0, 100)}...`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await parser.close();
  }
}

/**
 * Example 2: Extract and process tables
 */
async function example2() {
  console.log('\nExample 2: Table Extraction\n');

  const config: LayoutParserConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
    location: 'us',
    processorId: process.env.DOCUMENTAI_PROCESSOR_ID || 'your-processor-id',
  };

  const parser = new LayoutParser(config);

  try {
    const result = await parser.processDocument('./document.pdf', {
      extractTables: true,
      extractTextBlocks: false, // Only extract tables
      minConfidence: 0.7,
    });

    result.tables.forEach((table, index) => {
      console.log(`\nTable ${index + 1} (Page ${table.pageNumber}):`);
      console.log(`Dimensions: ${table.rowCount} × ${table.columnCount}`);
      console.log(`Confidence: ${(table.confidence * 100).toFixed(1)}%`);

      if (table.headers.length > 0) {
        console.log('\nHeaders:');
        table.headers.forEach((headerRow) => {
          console.log(`  ${headerRow.join(' | ')}`);
        });
      }

      if (table.rows.length > 0) {
        console.log('\nData (first 5 rows):');
        table.rows.slice(0, 5).forEach((row) => {
          console.log(`  ${row.join(' | ')}`);
        });
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await parser.close();
  }
}

/**
 * Example 3: Process from buffer
 */
async function example3() {
  console.log('\nExample 3: Process from Buffer\n');

  const config: LayoutParserConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
    location: 'us',
    processorId: process.env.DOCUMENTAI_PROCESSOR_ID || 'your-processor-id',
  };

  const parser = new LayoutParser(config);

  try {
    // Read file into buffer
    const buffer = fs.readFileSync('./document.pdf');

    // Process buffer
    const result = await parser.processDocumentBuffer(
      buffer,
      'application/pdf',
      { extractTables: true, extractTextBlocks: true }
    );

    console.log(`Processed ${result.pageCount} pages`);
    console.log(`Extracted ${result.fullText.length} characters`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await parser.close();
  }
}

/**
 * Example 4: Filter by confidence
 */
async function example4() {
  console.log('\nExample 4: High-Confidence Results Only\n');

  const config: LayoutParserConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
    location: 'us',
    processorId: process.env.DOCUMENTAI_PROCESSOR_ID || 'your-processor-id',
  };

  const parser = new LayoutParser(config);

  try {
    // Only extract high-confidence results
    const result = await parser.processDocument('./document.pdf', {
      extractTables: true,
      extractTextBlocks: true,
      minConfidence: 0.9, // 90% confidence or higher
    });

    console.log('High-confidence text blocks:');
    result.textBlocks.forEach((block) => {
      console.log(`  [${(block.confidence * 100).toFixed(1)}%] ${block.text.substring(0, 80)}...`);
    });

    console.log('\nHigh-confidence tables:');
    result.tables.forEach((table, i) => {
      console.log(`  Table ${i + 1}: ${(table.confidence * 100).toFixed(1)}% confidence`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await parser.close();
  }
}

/**
 * Example 5: Convert to Markdown
 */
async function example5() {
  console.log('\nExample 5: Convert to Markdown\n');

  const config: LayoutParserConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
    location: 'us',
    processorId: process.env.DOCUMENTAI_PROCESSOR_ID || 'your-processor-id',
  };

  const parser = new LayoutParser(config);

  try {
    // Process document
    const result = await parser.processDocument('./document.pdf', {
      extractTables: true,
      extractTextBlocks: true,
      minConfidence: 0.5,
    });

    // Convert to Markdown with full options
    const markdown = convertToMarkdown(result, {
      includePageSeparators: true,
      includeConfidence: true,
      includeBoundingBox: false,
      includeMetadata: true,
      pageHeadingLevel: 2,
    });

    // Save to file
    fs.writeFileSync('./output.md', markdown, 'utf-8');
    console.log('Markdown saved to: ./output.md');

    // Preview first 500 characters
    console.log('\nMarkdown preview:');
    console.log(markdown.substring(0, 500));
    console.log('...\n');

    // Also create a simple plain text version
    const plainMarkdown = convertToPlainMarkdown(result);
    fs.writeFileSync('./output-plain.md', plainMarkdown, 'utf-8');
    console.log('Plain markdown saved to: ./output-plain.md');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await parser.close();
  }
}

// Run examples
if (require.main === module) {
  console.log('Document AI Layout Parser - Examples\n');
  console.log('Note: Make sure to set up your environment variables before running:\n');
  console.log('  GOOGLE_CLOUD_PROJECT=your-project-id');
  console.log('  DOCUMENTAI_PROCESSOR_ID=your-processor-id\n');
  console.log('='.repeat(80));

  // Uncomment the example you want to run:
  // example1();
  // example2();
  // example3();
  // example4();
  // example5();

  console.log('\nUncomment an example function in example.ts to run it.');
}

export { example1, example2, example3, example4, example5 };
