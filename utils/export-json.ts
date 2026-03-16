/**
 * JSON Export Utility
 *
 * Exports resume data to JSON Resume format via the API.
 */

import { SimpleResumeData } from '../types';
import { convertToAPIData } from './api-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Options for JSON export
 */
export interface JsonExportOptions {
  /** Include ResumeAI-specific metadata (tailoring changes, etc.) */
  includeMetadata?: boolean;
  /** Resume title for metadata */
  title?: string;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Export resume data to JSON format
 *
 * @param resumeData - Resume data to export (SimpleResumeData format)
 * @param options - Export options
 * @returns Promise that resolves when download is triggered
 * @throws Error if export fails
 *
 * @example
 * ```typescript
 * await exportToJson(resumeData, {
 *   title: 'My Resume',
 *   tags: ['software-engineer', 'frontend'],
 * });
 * ```
 */
export async function exportToJson(
  resumeData: SimpleResumeData,
  options: JsonExportOptions = {},
): Promise<void> {
  const {
    includeMetadata = true,
    title,
    tags,
  } = options;

  try {
    // Convert to API format
    const apiData = convertToAPIData(resumeData);

    // Build query parameters
    const params = new URLSearchParams();
    params.append('include_metadata', includeMetadata.toString());
    if (title) params.append('title', title);
    if (tags) {
      tags.forEach((tag) => params.append('tags', tag));
    }

    // Get auth token
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make API request
    const response = await fetch(
      `${API_URL}/api/v1/export/json?${params.toString()}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(apiData),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Export failed with status ${response.status}`,
      );
    }

    // Get blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `resume-export-${new Date().toISOString().split('T')[0]}.json`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/i);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('JSON export failed:', error);
    throw error;
  }
}

/**
 * Download a JSON file from raw data (client-side only)
 *
 * @param data - Data to export
 * @param filename - Optional filename (default: resume-export-YYYY-MM-DD.json)
 */
export function downloadJsonFile(
  data: Record<string, unknown>,
  filename?: string,
): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download =
    filename || `resume-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
