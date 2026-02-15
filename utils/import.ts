/**
 * Utility functions for importing resumes from different formats
 */

import { ResumeData } from '../types';

/**
 * Import resume from JSON Resume format
 * @param json - JSON string or object
 * @returns Parsed resume data
 */
export async function importFromJSON(json: string | object): Promise<ResumeData> {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;

    // Validate JSON Resume format
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON Resume format');
    }

    // Return data as ResumeData
    return data as ResumeData;
  } catch (error) {
    console.error('Error importing JSON:', error);
    throw new Error('Failed to import JSON Resume');
  }
}

/**
 * Import resume from PDF (requires backend processing)
 * @param file - PDF file to import
 * @returns Parsed resume data
 */
export async function importFromPDF(file: File): Promise<ResumeData> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const apiKey = localStorage.getItem('RESUMEAI_API_KEY');

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/v1/import/pdf`, {
      method: 'POST',
      headers: {
        ...(apiKey && { 'X-API-KEY': apiKey }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to import PDF');
    }

    const data = await response.json();
    return data as ResumeData;
  } catch (error) {
    console.error('Error importing PDF:', error);
    throw new Error('Failed to import PDF. Please ensure the backend is running.');
  }
}

/**
 * Import resume from Word (DOCX) format
 * @param file - DOCX file to import
 * @returns Parsed resume data
 */
export async function importFromWord(file: File): Promise<ResumeData> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const apiKey = localStorage.getItem('RESUMEAI_API_KEY');

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/v1/import/docx`, {
      method: 'POST',
      headers: {
        ...(apiKey && { 'X-API-KEY': apiKey }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to import Word document');
    }

    const data = await response.json();
    return data as ResumeData;
  } catch (error) {
    console.error('Error importing Word:', error);
    throw new Error('Failed to import Word document. Please ensure the backend is running.');
  }
}

/**
 * Import resume from LinkedIn profile (requires backend processing)
 * @param linkedinUrl - LinkedIn profile URL
 * @returns Parsed resume data
 */
export async function importFromLinkedIn(linkedinUrl: string): Promise<ResumeData> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const apiKey = localStorage.getItem('RESUMEAI_API_KEY');

  try {
    const response = await fetch(`${API_URL}/v1/import/linkedin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-KEY': apiKey }),
      },
      body: JSON.stringify({ url: linkedinUrl }),
    });

    if (!response.ok) {
      throw new Error('Failed to import LinkedIn profile');
    }

    const data = await response.json();
    return data as ResumeData;
  } catch (error) {
    console.error('Error importing LinkedIn:', error);
    throw new Error('Failed to import LinkedIn profile. Please ensure the backend is running.');
  }
}

/**
 * Validate imported resume data
 * @param data - Resume data to validate
 * @returns Validation result
 */
export function validateImportedData(data: ResumeData): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for basic info
  if (!data.basics) {
    errors.push('Missing basic information (name, email, etc.)');
  } else {
    if (!data.basics.name) {
      warnings.push('Missing name in basic information');
    }
    if (!data.basics.email) {
      warnings.push('Missing email in basic information');
    }
  }

  // Check for work experience
  if (!data.work || data.work.length === 0) {
    warnings.push('No work experience entries found');
  }

  // Check for education
  if (!data.education || data.education.length === 0) {
    warnings.push('No education entries found');
  }

  // Check for skills
  if (!data.skills || data.skills.length === 0) {
    warnings.push('No skills found');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect format from file extension
 * @param filename - File name
 * @returns Format type
 */
export function detectFileFormat(filename: string): 'pdf' | 'docx' | 'json' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'json':
      return 'json';
    default:
      return 'unknown';
  }
}
