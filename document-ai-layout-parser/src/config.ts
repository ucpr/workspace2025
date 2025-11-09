/**
 * Configuration management for Document AI Layout Parser
 */

import { LayoutParserConfig } from './types';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  location: 'us',
  processorVersion: 'pretrained-layout-parser-v1.5-pro-2025-08-25', // Latest Gemini-powered version
} as const;

/**
 * Load configuration from environment variables or use defaults
 */
export function loadConfig(): Partial<LayoutParserConfig> {
  return {
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.DOCUMENTAI_LOCATION || DEFAULT_CONFIG.location,
    processorId: process.env.DOCUMENTAI_PROCESSOR_ID,
    processorVersion: process.env.DOCUMENTAI_PROCESSOR_VERSION || DEFAULT_CONFIG.processorVersion,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<LayoutParserConfig>): config is LayoutParserConfig {
  if (!config.projectId) {
    throw new Error('Missing required config: projectId (set GOOGLE_CLOUD_PROJECT environment variable)');
  }

  if (!config.processorId) {
    throw new Error('Missing required config: processorId (set DOCUMENTAI_PROCESSOR_ID environment variable)');
  }

  if (!config.location) {
    throw new Error('Missing required config: location');
  }

  return true;
}

/**
 * Get processor resource name
 */
export function getProcessorName(config: LayoutParserConfig): string {
  if (config.processorVersion) {
    return `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}/processorVersions/${config.processorVersion}`;
  }

  return `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;
}
