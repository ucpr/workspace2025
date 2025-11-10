/**
 * Markdown Converter for Document AI Layout Parser
 * Converts extraction results to Markdown format
 */

import { ExtractionResult, TextBlock, ExtractedTable } from './types';

/**
 * Options for Markdown conversion
 */
export interface MarkdownOptions {
  /** Include page separators */
  includePageSeparators?: boolean;

  /** Include confidence scores in comments */
  includeConfidence?: boolean;

  /** Include bounding box information */
  includeBoundingBox?: boolean;

  /** Add metadata header */
  includeMetadata?: boolean;

  /** Custom heading prefix for pages */
  pageHeadingLevel?: number;
}

/**
 * Converts extraction result to Markdown format
 * @param result - The extraction result from Document AI
 * @param options - Conversion options
 * @returns Markdown formatted string
 */
export function convertToMarkdown(
  result: ExtractionResult,
  options: MarkdownOptions = {}
): string {
  const {
    includePageSeparators = true,
    includeConfidence = false,
    includeBoundingBox = false,
    includeMetadata = true,
    pageHeadingLevel = 2,
  } = options;

  const sections: string[] = [];

  // Add metadata header
  if (includeMetadata) {
    sections.push(generateMetadataSection(result));
  }

  // Organize content by page
  const contentByPage = organizeContentByPage(result);

  // Convert each page
  Object.keys(contentByPage)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((pageNum) => {
      const pageContent = contentByPage[Number(pageNum)];
      const markdown = convertPageToMarkdown(
        Number(pageNum),
        pageContent,
        {
          includeConfidence,
          includeBoundingBox,
          pageHeadingLevel,
        }
      );

      sections.push(markdown);

      if (includePageSeparators && Number(pageNum) < result.pageCount) {
        sections.push('\n---\n');
      }
    });

  return sections.join('\n\n').trim();
}

/**
 * Generate metadata section
 */
function generateMetadataSection(result: ExtractionResult): string {
  const lines = [
    '# Document Information',
    '',
    `- **Pages**: ${result.pageCount}`,
    `- **MIME Type**: ${result.mimeType}`,
    `- **Processor Version**: ${result.metadata.processorVersion}`,
    `- **Processed At**: ${result.metadata.processedAt.toISOString()}`,
    `- **Text Blocks**: ${result.textBlocks.length}`,
    `- **Tables**: ${result.tables.length}`,
    '',
  ];

  return lines.join('\n');
}

/**
 * Organize content by page number
 */
interface PageContent {
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
}

function organizeContentByPage(result: ExtractionResult): {
  [pageNum: number]: PageContent;
} {
  const pages: { [pageNum: number]: PageContent } = {};

  // Initialize pages
  for (let i = 1; i <= result.pageCount; i++) {
    pages[i] = { textBlocks: [], tables: [] };
  }

  // Add text blocks
  result.textBlocks.forEach((block) => {
    if (pages[block.pageNumber]) {
      pages[block.pageNumber].textBlocks.push(block);
    }
  });

  // Add tables
  result.tables.forEach((table) => {
    if (pages[table.pageNumber]) {
      pages[table.pageNumber].tables.push(table);
    }
  });

  return pages;
}

/**
 * Convert a single page to Markdown
 */
function convertPageToMarkdown(
  pageNum: number,
  content: PageContent,
  options: {
    includeConfidence: boolean;
    includeBoundingBox: boolean;
    pageHeadingLevel: number;
  }
): string {
  const sections: string[] = [];
  const heading = '#'.repeat(options.pageHeadingLevel);

  sections.push(`${heading} Page ${pageNum}`);
  sections.push('');

  // Combine text blocks and tables, then sort by position
  const allElements: Array<
    | { type: 'text'; data: TextBlock; order: number }
    | { type: 'table'; data: ExtractedTable; order: number }
  > = [];

  content.textBlocks.forEach((block, index) => {
    allElements.push({
      type: 'text',
      data: block,
      order: block.boundingBox?.y ?? index,
    });
  });

  content.tables.forEach((table, index) => {
    allElements.push({
      type: 'table',
      data: table,
      order: table.boundingBox?.y ?? 1000 + index,
    });
  });

  // Sort by vertical position (y coordinate)
  allElements.sort((a, b) => a.order - b.order);

  // Convert elements to Markdown
  allElements.forEach((element) => {
    if (element.type === 'text') {
      const textMd = convertTextBlockToMarkdown(element.data, options);
      sections.push(textMd);
    } else if (element.type === 'table') {
      const tableMd = convertTableToMarkdown(element.data, options);
      sections.push(tableMd);
    }
  });

  return sections.join('\n');
}

/**
 * Convert text block to Markdown
 */
function convertTextBlockToMarkdown(
  block: TextBlock,
  options: { includeConfidence: boolean; includeBoundingBox: boolean }
): string {
  const lines: string[] = [];

  // Add confidence and position as HTML comment if requested
  if (options.includeConfidence || options.includeBoundingBox) {
    const metadata: string[] = [];
    if (options.includeConfidence) {
      metadata.push(`confidence: ${(block.confidence * 100).toFixed(2)}%`);
    }
    if (options.includeBoundingBox && block.boundingBox) {
      metadata.push(
        `position: (${block.boundingBox.x.toFixed(3)}, ${block.boundingBox.y.toFixed(3)})`
      );
    }
    lines.push(`<!-- ${metadata.join(', ')} -->`);
  }

  // Convert text based on type
  switch (block.type) {
    case 'heading':
      lines.push(`### ${block.text}`);
      break;
    case 'title':
      lines.push(`## ${block.text}`);
      break;
    case 'list':
      // Simple list handling - each line becomes a list item
      const listItems = block.text.split('\n').filter((line) => line.trim());
      listItems.forEach((item) => {
        lines.push(`- ${item.trim()}`);
      });
      break;
    case 'paragraph':
    case 'other':
    default:
      lines.push(block.text);
      break;
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Convert table to Markdown table format
 */
function convertTableToMarkdown(
  table: ExtractedTable,
  options: { includeConfidence: boolean; includeBoundingBox: boolean }
): string {
  const lines: string[] = [];

  // Add metadata as HTML comment if requested
  if (options.includeConfidence || options.includeBoundingBox) {
    const metadata: string[] = [];
    metadata.push(
      `table: ${table.rowCount} rows × ${table.columnCount} columns`
    );
    if (options.includeConfidence) {
      metadata.push(`confidence: ${(table.confidence * 100).toFixed(2)}%`);
    }
    if (options.includeBoundingBox && table.boundingBox) {
      metadata.push(
        `position: (${table.boundingBox.x.toFixed(3)}, ${table.boundingBox.y.toFixed(3)})`
      );
    }
    lines.push(`<!-- ${metadata.join(', ')} -->`);
  }

  // Build markdown table
  const allRows = [...table.headers, ...table.rows];

  if (allRows.length === 0) {
    lines.push('_Empty table_');
    lines.push('');
    return lines.join('\n');
  }

  // Determine column count
  const columnCount = Math.max(
    ...allRows.map((row) => row.length),
    table.columnCount
  );

  // Add header row (use first row as header if headers exist, otherwise create generic headers)
  let headerRow: string[];
  let dataRows: string[][];

  if (table.headers.length > 0) {
    headerRow = table.headers[0];
    // If there are multiple header rows, merge them or use additional rows
    if (table.headers.length > 1) {
      // Merge multiple header rows into one
      headerRow = table.headers[0].map((cell, colIndex) => {
        const headerCells = table.headers
          .map((row) => row[colIndex])
          .filter((c) => c && c.trim());
        return headerCells.join(' ');
      });
    }
    dataRows = table.rows;
  } else if (table.rows.length > 0) {
    // Use first data row as header if no headers exist
    headerRow = table.rows[0];
    dataRows = table.rows.slice(1);
  } else {
    // Create generic headers
    headerRow = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
    dataRows = [];
  }

  // Ensure header has correct column count
  while (headerRow.length < columnCount) {
    headerRow.push('');
  }

  // Format header
  const formattedHeader = `| ${headerRow.map((cell) => escapeMarkdownCell(cell)).join(' | ')} |`;
  const separator = `| ${Array(columnCount).fill('---').join(' | ')} |`;

  lines.push(formattedHeader);
  lines.push(separator);

  // Format data rows
  dataRows.forEach((row) => {
    const cells = [...row];
    // Pad row to match column count
    while (cells.length < columnCount) {
      cells.push('');
    }
    const formattedRow = `| ${cells.map((cell) => escapeMarkdownCell(cell)).join(' | ')} |`;
    lines.push(formattedRow);
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Escape special Markdown characters in table cells
 */
function escapeMarkdownCell(cell: string): string {
  if (!cell) {
    return '';
  }

  return (
    cell
      .replace(/\n/g, '<br>')
      .replace(/\|/g, '\\|')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Convert extraction result to simple plain text Markdown (no tables)
 * Useful for text-heavy documents
 */
export function convertToPlainMarkdown(result: ExtractionResult): string {
  const sections: string[] = [];

  sections.push(`# Document (${result.pageCount} pages)`);
  sections.push('');

  result.textBlocks.forEach((block) => {
    sections.push(block.text);
    sections.push('');
  });

  return sections.join('\n').trim();
}
