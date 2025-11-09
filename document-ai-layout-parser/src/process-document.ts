/**
 * Document processing script
 * Example usage of the Document AI Layout Parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { LayoutParser } from './layout-parser';
import { loadConfig, validateConfig } from './config';
import { ExtractionResult } from './types';

/**
 * Format extraction results for display
 */
function formatResults(result: ExtractionResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTION RESULTS');
  console.log('='.repeat(80));

  console.log('\n📊 Document Information:');
  console.log(`   Pages: ${result.pageCount}`);
  console.log(`   MIME Type: ${result.mimeType}`);
  console.log(`   Processor Version: ${result.metadata.processorVersion}`);
  console.log(`   Processed At: ${result.metadata.processedAt.toISOString()}`);

  console.log('\n📝 Text Blocks:');
  console.log(`   Total: ${result.textBlocks.length}`);
  result.textBlocks.slice(0, 5).forEach((block, index) => {
    console.log(`\n   [${index + 1}] Page ${block.pageNumber} - ${block.type.toUpperCase()}`);
    console.log(`       Confidence: ${(block.confidence * 100).toFixed(2)}%`);
    console.log(`       Text: ${block.text.substring(0, 100)}${block.text.length > 100 ? '...' : ''}`);
    if (block.boundingBox) {
      console.log(`       Position: (${block.boundingBox.x.toFixed(3)}, ${block.boundingBox.y.toFixed(3)})`);
    }
  });

  if (result.textBlocks.length > 5) {
    console.log(`\n   ... and ${result.textBlocks.length - 5} more text blocks`);
  }

  console.log('\n📋 Tables:');
  console.log(`   Total: ${result.tables.length}`);
  result.tables.forEach((table, index) => {
    console.log(`\n   [${index + 1}] Page ${table.pageNumber}`);
    console.log(`       Dimensions: ${table.rowCount} rows × ${table.columnCount} columns`);
    console.log(`       Confidence: ${(table.confidence * 100).toFixed(2)}%`);

    if (table.headers.length > 0) {
      console.log(`       Headers:`);
      table.headers.forEach((headerRow, rowIndex) => {
        console.log(`         Row ${rowIndex + 1}: ${headerRow.join(' | ')}`);
      });
    }

    if (table.rows.length > 0) {
      console.log(`       Sample Data (first 3 rows):`);
      table.rows.slice(0, 3).forEach((row, rowIndex) => {
        console.log(`         Row ${rowIndex + 1}: ${row.join(' | ')}`);
      });

      if (table.rows.length > 3) {
        console.log(`         ... and ${table.rows.length - 3} more rows`);
      }
    }
  });

  console.log('\n📄 Full Text Preview:');
  const preview = result.fullText.substring(0, 500);
  console.log(`   ${preview}${result.fullText.length > 500 ? '...' : ''}`);
  console.log(`\n   Total characters: ${result.fullText.length}`);

  console.log('\n' + '='.repeat(80));
}

/**
 * Save extraction results to JSON file
 */
function saveResults(result: ExtractionResult, outputPath: string): void {
  const jsonOutput = JSON.stringify(result, null, 2);
  fs.writeFileSync(outputPath, jsonOutput, 'utf-8');
  console.log(`\n💾 Results saved to: ${outputPath}`);
}

/**
 * Main processing function
 */
async function main() {
  try {
    // Load configuration from environment variables
    const partialConfig = loadConfig();

    if (!validateConfig(partialConfig)) {
      throw new Error('Invalid configuration');
    }

    const config = partialConfig;

    console.log('🚀 Document AI Layout Parser');
    console.log('   Using latest Gemini-powered processor (2025)');
    console.log(`   Project: ${config.projectId}`);
    console.log(`   Location: ${config.location}`);
    console.log(`   Processor: ${config.processorId}`);
    console.log(`   Version: ${config.processorVersion || 'latest'}`);

    // Get file path from command line arguments
    const filePath = process.argv[2];

    if (!filePath) {
      console.error('\n❌ Error: No file path provided');
      console.log('\nUsage:');
      console.log('  npm run process <file-path>');
      console.log('\nExample:');
      console.log('  npm run process ./samples/document.pdf');
      console.log('\nSupported file types:');
      console.log('  - PDF (.pdf)');
      console.log('  - Word (.doc, .docx)');
      console.log('  - Excel (.xls, .xlsx)');
      console.log('  - PowerPoint (.ppt, .pptx)');
      console.log('  - HTML (.html, .htm)');
      console.log('\nEnvironment variables required:');
      console.log('  GOOGLE_CLOUD_PROJECT=your-project-id');
      console.log('  DOCUMENTAI_PROCESSOR_ID=your-processor-id');
      console.log('  DOCUMENTAI_LOCATION=us (optional, defaults to "us")');
      console.log('  DOCUMENTAI_PROCESSOR_VERSION=pretrained-layout-parser-v1.5-pro-2025-08-25 (optional)');
      process.exit(1);
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`\n❌ Error: File not found: ${filePath}`);
      process.exit(1);
    }

    // Initialize the parser
    const parser = new LayoutParser(config);

    // Process the document
    console.log('\n⏳ Processing document...\n');
    const result = await parser.processDocument(filePath, {
      extractTables: true,
      extractTextBlocks: true,
      minConfidence: 0.0,
      enableOcr: true,
    });

    // Display results
    formatResults(result);

    // Save results to JSON file
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(outputDir, `${baseName}_${timestamp}.json`);
    saveResults(result, outputPath);

    // Close the client
    await parser.close();

    console.log('\n✅ Processing completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error processing document:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

export { main };
