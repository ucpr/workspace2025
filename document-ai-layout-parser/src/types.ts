/**
 * Document AI Layout Parser Types
 * Based on Google Cloud Document AI v1 API (2025)
 */

// Type aliases for Document AI types
export type Document = any;
export type Page = any;
export type Table = any;
export type Paragraph = any;
export type Layout = any;

/**
 * Configuration for Document AI Layout Parser
 */
export interface LayoutParserConfig {
  /** Google Cloud Project ID */
  projectId: string;

  /** Location of the processor (e.g., 'us' or 'eu') */
  location: string;

  /** Processor ID from Document AI Console */
  processorId: string;

  /** Optional: Specific processor version
   * Latest versions (2025):
   * - pretrained-layout-parser-v1.5-pro-2025-08-25 (Gemini-powered, recommended)
   * - pretrained-layout-parser-v1.5-2025-08-25
   * - pretrained-layout-parser-v1.4-2025-08-25
   */
  processorVersion?: string;
}

/**
 * Extracted text block with metadata
 */
export interface TextBlock {
  text: string;
  type: 'paragraph' | 'heading' | 'title' | 'list' | 'other';
  confidence: number;
  pageNumber: number;
  boundingBox?: BoundingBox;
}

/**
 * Extracted table with structured data
 */
export interface ExtractedTable {
  pageNumber: number;
  rowCount: number;
  columnCount: number;
  headers: string[][];
  rows: string[][];
  confidence: number;
  boundingBox?: BoundingBox;
}

/**
 * Bounding box coordinates
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Complete extraction result
 */
export interface ExtractionResult {
  /** All extracted text blocks */
  textBlocks: TextBlock[];

  /** All extracted tables */
  tables: ExtractedTable[];

  /** Full extracted text */
  fullText: string;

  /** Number of pages processed */
  pageCount: number;

  /** MIME type of the processed document */
  mimeType: string;

  /** Processing metadata */
  metadata: {
    processorVersion: string;
    processedAt: Date;
  };
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  /** Extract tables from the document */
  extractTables?: boolean;

  /** Extract text blocks with structure */
  extractTextBlocks?: boolean;

  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;

  /** Enable OCR for scanned documents */
  enableOcr?: boolean;
}
