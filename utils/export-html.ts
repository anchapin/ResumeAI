/**
 * HTML Export Utility
 *
 * Exports resume data to HTML format with embedded CSS.
 */

import { SimpleResumeData } from '../types';
import { convertToAPIData } from './api-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Available HTML templates
 */
export type HtmlTemplate = 'modern' | 'classic' | 'minimal';

/**
 * Options for HTML export
 */
export interface HtmlExportOptions {
  /** Template to use (default: modern) */
  template?: HtmlTemplate;
  /** Enable dark mode support via prefers-color-scheme (default: true) */
  darkMode?: boolean;
  /** Resume title */
  title?: string;
}

/**
 * Export resume data to HTML format
 *
 * @param resumeData - Resume data to export (SimpleResumeData format)
 * @param options - Export options
 * @returns Promise that resolves when download is triggered
 * @throws Error if export fails
 *
 * @example
 * ```typescript
 * await exportToHtml(resumeData, {
 *   template: 'modern',
 *   darkMode: true,
 *   title: 'My Resume',
 * });
 * ```
 */
export async function exportToHtml(
  resumeData: SimpleResumeData,
  options: HtmlExportOptions = {},
): Promise<void> {
  const {
    template = 'modern',
    darkMode = true,
    title,
  } = options;

  try {
    // Convert to API format
    const apiData = convertToAPIData(resumeData);

    // Build query parameters
    const params = new URLSearchParams();
    params.append('template', template);
    params.append('dark_mode', darkMode.toString());
    if (title) params.append('title', title);

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
      `${API_URL}/api/v1/export/html?${params.toString()}`,
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
    let filename = `resume-export-${new Date().toISOString().split('T')[0]}.html`;
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
    console.error('HTML export failed:', error);
    throw error;
  }
}

/**
 * Preview a template with sample content
 *
 * @param template - Template name to preview
 * @returns Promise resolving to HTML preview content
 * @throws Error if preview fails
 */
export async function previewTemplate(
  template: HtmlTemplate,
): Promise<string> {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_URL}/api/v1/export/preview/${template}`,
      {
        method: 'GET',
        headers,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Preview failed with status ${response.status}`,
      );
    }

    return await response.text();
  } catch (error) {
    console.error('Template preview failed:', error);
    throw error;
  }
}
