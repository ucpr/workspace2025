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

    // Extract content
    const textBlocks = extractTextBlocks ? this.extractTextBlocks(document, minConfidence) : [];
    const tables = extractTables ? this.extractTables(document, minConfidence) : [];
    const fullText = document.text || '';

    return {
      textBlocks,
      tables,
      fullText,
      pageCount: document.pages?.length || 0,
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

    const textBlocks = extractTextBlocks ? this.extractTextBlocks(document, minConfidence) : [];
    const tables = extractTables ? this.extractTables(document, minConfidence) : [];
    const fullText = document.text || '';

    return {
      textBlocks,
      tables,
      fullText,
      pageCount: document.pages?.length || 0,
      mimeType,
      metadata: {
        processorVersion: this.config.processorVersion || 'latest',
        processedAt: new Date(),
      },
    };
  }

  /**
   * Extract text blocks with structure information
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
