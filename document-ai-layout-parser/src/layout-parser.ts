/**
 * Document AI Layout Parser
 * Extracts text, tables, and structured content from documents
 * Using Google Cloud Document AI v1 API (2025)
 */

import { DocumentProcessorServiceClient, protos } from '@google-cloud/documentai';
import * as fs from 'fs';
import * as path from 'path';
import {
  LayoutParserConfig,
  ExtractionResult,
  ProcessingOptions,
  TextBlock,
  ExtractedTable,
  BoundingBox,
  Document,
  Table,
  Paragraph,
  Layout,
} from './types';
import { getProcessorName } from './config';

/**
 * Layout Parser class for processing documents with Document AI
 */
export class LayoutParser {
  private client: DocumentProcessorServiceClient;
  private config: LayoutParserConfig;

  constructor(config: LayoutParserConfig) {
    this.config = config;
    this.client = new DocumentProcessorServiceClient();
  }

  /**
   * Process a document file and extract structured content
   * @param filePath - Path to the document file (PDF, Office files, HTML)
   * @param options - Processing options
   * @returns Extraction result with text, tables, and metadata
   */
  async processDocument(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<ExtractionResult> {
    const {
      extractTables = true,
      extractTextBlocks = true,
      minConfidence = 0.0,
    } = options;

    // Read the file
    const fileContent = fs.readFileSync(filePath);
    const mimeType = this.getMimeType(filePath);

    // Prepare the request
    const processorName = getProcessorName(this.config);
    const request: protos.google.cloud.documentai.v1.IProcessRequest = {
      name: processorName,
      rawDocument: {
        content: fileContent,
        mimeType: mimeType,
      },
      processOptions: {
        ocrConfig: {
          enableNativePdfParsing: true,
          enableImageQualityScores: true,
          enableSymbol: true,
        },
      },
    };

    console.log(`Processing document: ${path.basename(filePath)}`);
    console.log(`Processor: ${processorName}`);
    console.log(`MIME type: ${mimeType}`);

    // Process the document
    const [result] = await this.client.processDocument(request);
    const { document } = result;

    if (!document) {
      throw new Error('No document returned from processing');
    }

    // Debug: Log document structure
    console.log('\n=== Document Structure Debug ===');
    console.log('Has pages:', !!document.pages);
    console.log('Has documentLayout:', !!(document as any).documentLayout);
    console.log('Has text:', !!document.text);
    if (document.pages) {
      console.log('Pages count:', document.pages.length);
    }
    if ((document as any).documentLayout) {
      console.log('DocumentLayout blocks count:', (document as any).documentLayout?.blocks?.length);
    }

    // Save full document for debugging
    const debugPath = './debug-document.json';
    require('fs').writeFileSync(debugPath, JSON.stringify(document, null, 2));
    console.log(`Full document saved to: ${debugPath}`);
    console.log('=================================\n');

    // Extract content - support both old (pages) and new (documentLayout) formats
    let textBlocks: TextBlock[] = [];
    let tables: ExtractedTable[] = [];
    let fullText = '';
    let pageCount = 0;

    // Check if using new documentLayout format
    const docLayout = (document as any).documentLayout;
    if (docLayout && docLayout.blocks) {
      console.log('Using new documentLayout.blocks format');
      const extracted = this.extractFromDocumentLayout(docLayout, minConfidence, extractTextBlocks, extractTables);
      textBlocks = extracted.textBlocks;
      tables = extracted.tables;
      fullText = extracted.fullText;
      pageCount = 1; // documentLayout doesn't have explicit page count
    } else if (document.pages) {
      console.log('Using legacy pages format');
      textBlocks = extractTextBlocks ? this.extractTextBlocks(document, minConfidence) : [];
      tables = extractTables ? this.extractTables(document, minConfidence) : [];
      fullText = document.text || '';
      pageCount = document.pages.length;
    } else {
      console.warn('Unknown document format - no pages or documentLayout found');
      fullText = document.text || '';
    }

    return {
      textBlocks,
      tables,
      fullText,
      pageCount,
      mimeType,
      metadata: {
        processorVersion: this.config.processorVersion || 'latest',
        processedAt: new Date(),
      },
    };
  }

  /**
   * Process a document from buffer
   * @param buffer - Document buffer
   * @param mimeType - MIME type of the document
   * @param options - Processing options
   * @returns Extraction result
   */
  async processDocumentBuffer(
    buffer: Buffer,
    mimeType: string,
    options: ProcessingOptions = {}
  ): Promise<ExtractionResult> {
    const {
      extractTables = true,
      extractTextBlocks = true,
      minConfidence = 0.0,
    } = options;

    const processorName = getProcessorName(this.config);
    const request: protos.google.cloud.documentai.v1.IProcessRequest = {
      name: processorName,
      rawDocument: {
        content: buffer,
        mimeType: mimeType,
      },
      processOptions: {
        ocrConfig: {
          enableNativePdfParsing: true,
          enableImageQualityScores: true,
          enableSymbol: true,
        },
      },
    };

    console.log(`Processing document from buffer`);
    console.log(`Processor: ${processorName}`);
    console.log(`MIME type: ${mimeType}`);

    const [result] = await this.client.processDocument(request);
    const { document } = result;

    if (!document) {
      throw new Error('No document returned from processing');
    }

    // Debug: Log document structure
    console.log('\n=== Document Structure Debug (Buffer) ===');
    console.log('Has pages:', !!document.pages);
    console.log('Has documentLayout:', !!(document as any).documentLayout);
    console.log('Has text:', !!document.text);
    if (document.pages) {
      console.log('Pages count:', document.pages.length);
    }
    if ((document as any).documentLayout) {
      console.log('DocumentLayout blocks count:', (document as any).documentLayout?.blocks?.length);
    }

    // Save full document for debugging
    const debugPath = './debug-document-buffer.json';
    require('fs').writeFileSync(debugPath, JSON.stringify(document, null, 2));
    console.log(`Full document saved to: ${debugPath}`);
    console.log('=================================\n');

    // Extract content - support both old (pages) and new (documentLayout) formats
    let textBlocks: TextBlock[] = [];
    let tables: ExtractedTable[] = [];
    let fullText = '';
    let pageCount = 0;

    // Check if using new documentLayout format
    const docLayout = (document as any).documentLayout;
    if (docLayout && docLayout.blocks) {
      console.log('Using new documentLayout.blocks format');
      const extracted = this.extractFromDocumentLayout(docLayout, minConfidence, extractTextBlocks, extractTables);
      textBlocks = extracted.textBlocks;
      tables = extracted.tables;
      fullText = extracted.fullText;
      pageCount = 1; // documentLayout doesn't have explicit page count
    } else if (document.pages) {
      console.log('Using legacy pages format');
      textBlocks = extractTextBlocks ? this.extractTextBlocks(document, minConfidence) : [];
      tables = extractTables ? this.extractTables(document, minConfidence) : [];
      fullText = document.text || '';
      pageCount = document.pages.length;
    } else {
      console.warn('Unknown document format - no pages or documentLayout found');
      fullText = document.text || '';
    }

    return {
      textBlocks,
      tables,
      fullText,
      pageCount,
      mimeType,
      metadata: {
        processorVersion: this.config.processorVersion || 'latest',
        processedAt: new Date(),
      },
    };
  }

  /**
   * Extract content from new documentLayout format
   */
  private extractFromDocumentLayout(
    documentLayout: any,
    minConfidence: number,
    extractTextBlocks: boolean,
    extractTables: boolean
  ): { textBlocks: TextBlock[]; tables: ExtractedTable[]; fullText: string } {
    const textBlocks: TextBlock[] = [];
    const tables: ExtractedTable[] = [];
    const fullTextParts: string[] = [];

    if (!documentLayout.blocks) {
      return { textBlocks, tables, fullText: '' };
    }

    documentLayout.blocks.forEach((block: any, blockIndex: number) => {
      // Extract text blocks
      if (block.textBlock && extractTextBlocks) {
        const textBlock = block.textBlock;
        const text = textBlock.text || '';
        const type = this.mapTextBlockType(textBlock.type);

        if (text) {
          fullTextParts.push(text);
          textBlocks.push({
            text,
            type,
            confidence: 1.0, // documentLayout doesn't provide confidence scores
            pageNumber: 1, // documentLayout doesn't have page numbers
            boundingBox: undefined, // documentLayout doesn't provide bounding boxes in this format
          });
        }
      }

      // Extract tables
      if (block.tableBlock && extractTables) {
        const tableBlock = block.tableBlock;
        const extractedTable = this.extractTableFromTableBlock(tableBlock, blockIndex);

        if (extractedTable) {
          tables.push(extractedTable);

          // Add table text to fullText
          const tableText = this.tableToText(extractedTable);
          if (tableText) {
            fullTextParts.push(tableText);
          }
        }
      }
    });

    return {
      textBlocks,
      tables,
      fullText: fullTextParts.join('\n\n'),
    };
  }

  /**
   * Map textBlock type to our TextBlock type
   */
  private mapTextBlockType(type: string | undefined): TextBlock['type'] {
    if (!type) {
      return 'paragraph';
    }

    const typeLower = type.toLowerCase();
    if (typeLower.includes('heading')) {
      return 'heading';
    }
    if (typeLower.includes('title')) {
      return 'title';
    }
    if (typeLower.includes('list')) {
      return 'list';
    }
    if (typeLower.includes('footer') || typeLower.includes('header')) {
      return 'other';
    }
    return 'paragraph';
  }

  /**
   * Extract table from tableBlock
   */
  private extractTableFromTableBlock(tableBlock: any, blockIndex: number): ExtractedTable | null {
    if (!tableBlock.bodyRows || tableBlock.bodyRows.length === 0) {
      return null;
    }

    const bodyRows = tableBlock.bodyRows;
    const headerRows = tableBlock.headerRows || [];

    // Extract headers
    const headers: string[][] = [];
    headerRows.forEach((row: any) => {
      if (row.cells) {
        const headerCells = row.cells.map((cell: any) => this.extractTextFromCell(cell));
        headers.push(headerCells);
      }
    });

    // Extract body rows
    const rows: string[][] = [];
    let columnCount = 0;

    bodyRows.forEach((row: any) => {
      if (row.cells) {
        const rowCells = row.cells.map((cell: any) => this.extractTextFromCell(cell));
        rows.push(rowCells);
        columnCount = Math.max(columnCount, rowCells.length);
      }
    });

    return {
      pageNumber: 1,
      rowCount: rows.length,
      columnCount,
      headers,
      rows,
      confidence: 1.0, // documentLayout doesn't provide confidence
      boundingBox: undefined,
    };
  }

  /**
   * Extract text from a table cell
   */
  private extractTextFromCell(cell: any): string {
    const textParts: string[] = [];

    if (cell.blocks) {
      cell.blocks.forEach((block: any) => {
        if (block.textBlock && block.textBlock.text) {
          textParts.push(block.textBlock.text);
        }
      });
    }

    return textParts.join(' ').trim();
  }

  /**
   * Convert table to plain text representation
   */
  private tableToText(table: ExtractedTable): string {
    const lines: string[] = [];

    // Add headers
    table.headers.forEach((headerRow) => {
      lines.push(headerRow.join(' | '));
    });

    // Add rows
    table.rows.forEach((row) => {
      lines.push(row.join(' | '));
    });

    return lines.join('\n');
  }

  /**
   * Extract text blocks with structure information (legacy format)
   */
  private extractTextBlocks(document: Document, minConfidence: number): TextBlock[] {
    const textBlocks: TextBlock[] = [];

    if (!document.pages || !document.text) {
      return textBlocks;
    }

    document.pages.forEach((page, pageIndex) => {
      if (!page.paragraphs) {
        return;
      }

      page.paragraphs.forEach((paragraph) => {
        const text = this.getTextFromLayout(paragraph.layout, document.text!);
        const confidence = paragraph.layout?.confidence || 0;

        if (confidence >= minConfidence && text) {
          textBlocks.push({
            text,
            type: this.determineParagraphType(paragraph),
            confidence,
            pageNumber: pageIndex + 1,
            boundingBox: this.getBoundingBox(paragraph.layout),
          });
        }
      });
    });

    return textBlocks;
  }

  /**
   * Extract tables from the document
   */
  private extractTables(document: Document, minConfidence: number): ExtractedTable[] {
    const extractedTables: ExtractedTable[] = [];

    if (!document.pages || !document.text) {
      return extractedTables;
    }

    document.pages.forEach((page, pageIndex) => {
      if (!page.tables) {
        return;
      }

      page.tables.forEach((table) => {
        const extractedTable = this.extractTableData(table, document.text!, pageIndex + 1);

        if (extractedTable.confidence >= minConfidence) {
          extractedTables.push(extractedTable);
        }
      });
    });

    return extractedTables;
  }

  /**
   * Extract data from a table
   */
  private extractTableData(table: Table, fullText: string, pageNumber: number): ExtractedTable {
    const { headerRows = [], bodyRows = [] } = table;
    const allRows = [...(headerRows || []), ...(bodyRows || [])];

    // Determine dimensions
    const rowCount = allRows.length;
    const columnCount = Math.max(
      ...allRows.map((row: any) => row.cells?.length || 0),
      0
    );

    // Extract headers
    const headers: string[][] = [];
    headerRows?.forEach((row: any) => {
      const headerCells = (row.cells || []).map((cell: any) =>
        this.getTextFromLayout(cell.layout, fullText)
      );
      headers.push(headerCells);
    });

    // Extract body rows
    const rows: string[][] = [];
    bodyRows?.forEach((row: any) => {
      const rowCells = (row.cells || []).map((cell: any) =>
        this.getTextFromLayout(cell.layout, fullText)
      );
      rows.push(rowCells);
    });

    // Calculate average confidence
    const confidences = allRows.flatMap((row: any) =>
      (row.cells || []).map((cell: any) => cell.layout?.confidence || 0)
    );
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    return {
      pageNumber,
      rowCount,
      columnCount,
      headers,
      rows,
      confidence: avgConfidence,
      boundingBox: this.getBoundingBox(table.layout),
    };
  }

  /**
   * Get text from layout segments
   */
  private getTextFromLayout(
    layout: Layout | null | undefined,
    fullText: string
  ): string {
    if (!layout || !layout.textAnchor || !layout.textAnchor.textSegments) {
      return '';
    }

    const segments = layout.textAnchor.textSegments;
    let text = '';

    segments.forEach((segment: any) => {
      const startIndex = Number(segment.startIndex) || 0;
      const endIndex = Number(segment.endIndex) || 0;
      text += fullText.substring(startIndex, endIndex);
    });

    return text.trim();
  }

  /**
   * Determine paragraph type based on layout
   */
  private determineParagraphType(paragraph: Paragraph): TextBlock['type'] {
    const layout = paragraph.layout;

    if (!layout) {
      return 'other';
    }

    // Determine type based on layout characteristics
    // Note: ILayout may not have explicit type property, so we use heuristics
    return 'paragraph';
  }

  /**
   * Extract bounding box from layout
   */
  private getBoundingBox(
    layout: Layout | null | undefined
  ): BoundingBox | undefined {
    if (!layout || !layout.boundingPoly || !layout.boundingPoly.normalizedVertices) {
      return undefined;
    }

    const vertices = layout.boundingPoly.normalizedVertices;
    if (vertices.length < 2) {
      return undefined;
    }

    const xs = vertices.map((v: any) => v.x || 0);
    const ys = vertices.map((v: any) => v.y || 0);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Determine MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    return mimeTypes[ext] || 'application/pdf';
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}
