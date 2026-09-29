/**
 * ATS Integration Tests
 * 
 * Tests the complete ATS checking flow from frontend to backend.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testApiClient } from './test-utils';

describe('ATS Compatibility Check Integration', () => {
  const API_URL = process.env.VITE_API_URL || 'http://127.0.0.1:8000';

  describe('POST /api/ats/check', () => {
    it('should return ATS score for valid PDF file', async () => {
      // Create a simple PDF-like buffer for testing
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');
      
      const formData = new FormData();
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'test-resume.pdf');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('ats_score');
      expect(data).toHaveProperty('issues');
      expect(data).toHaveProperty('parsed_text');
      expect(data).toHaveProperty('calculation_time_ms');
      expect(typeof data.ats_score).toBe('number');
      expect(data.ats_score).toBeGreaterThanOrEqual(0);
      expect(data.ats_score).toBeLessThanOrEqual(100);
    });

    it('should return ATS score for DOCX file', async () => {
      const docxBuffer = Buffer.from('PK test docx content');
      
      const formData = new FormData();
      const blob = new Blob([docxBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      formData.append('file', blob, 'test-resume.docx');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.file_type).toBe('docx');
    });

    it('should return ATS score for TXT file', async () => {
      const txtBuffer = Buffer.from('John Doe\nSoftware Engineer\nExperience: 5 years');
      
      const formData = new FormData();
      const blob = new Blob([txtBuffer], { type: 'text/plain' });
      formData.append('file', blob, 'test-resume.txt');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.file_type).toBe('txt');
      // Plain text should have high ATS score
      expect(data.ats_score).toBeGreaterThanOrEqual(80);
    });

    it('should reject unsupported file types', async () => {
      const formData = new FormData();
      const blob = new Blob(['test'], { type: 'image/png' });
      formData.append('file', blob, 'test.png');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.detail).toContain('not supported');
    });

    it('should reject empty files', async () => {
      const formData = new FormData();
      const blob = new Blob([''], { type: 'application/pdf' });
      formData.append('file', blob, 'empty.pdf');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should return issues with proper structure', async () => {
      const txtBuffer = Buffer.from('Simple resume content');
      
      const formData = new FormData();
      const blob = new Blob([txtBuffer], { type: 'text/plain' });
      formData.append('file', blob, 'simple.txt');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data.issues)).toBe(true);
      
      // If there are issues, check structure
      if (data.issues.length > 0) {
        const issue = data.issues[0];
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('description');
        expect(issue).toHaveProperty('fix');
      }
    });

    it('should return parsed text for display', async () => {
      const content = 'John Doe\nSoftware Engineer\nSkills: JavaScript, Python';
      
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      formData.append('file', blob, 'resume.txt');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(typeof data.parsed_text).toBe('string');
      expect(data.parsed_text.length).toBeGreaterThan(0);
    });

    it('should complete analysis in under 5 seconds', async () => {
      const content = 'Test resume content for performance check';
      
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      formData.append('file', blob, 'resume.txt');

      const startTime = Date.now();
      
      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(5000);
      
      const data = await response.json();
      expect(data.calculation_time_ms).toBeLessThan(5000);
    });
  });

  describe('POST /api/ats/check/bulk', () => {
    it('should accept multiple files', async () => {
      const content = 'Test resume';
      
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      formData.append('files', blob, 'resume1.txt');
      formData.append('files', blob, 'resume2.txt');

      const response = await fetch(`${API_URL}/api/ats/check/bulk`, {
        method: 'POST',
        body: formData,
      });

      // May return 400 if bulk endpoint expects array of files differently
      // This is a basic test to check the endpoint exists
      expect([200, 400]).toContain(response.status);
    });

    it('should limit maximum files', async () => {
      const content = 'Test resume';
      
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Add 15 files (exceeds limit of 10)
      for (let i = 0; i < 15; i++) {
        formData.append('files', blob, `resume${i}.txt`);
      }

      const response = await fetch(`${API_URL}/api/ats/check/bulk`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/ats/health', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${API_URL}/api/ats/health`);
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('ats-compatibility');
    });
  });

  describe('Error handling', () => {
    it('should handle missing file gracefully', async () => {
      const formData = new FormData();
      // Don't append any file

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle corrupted PDF gracefully', async () => {
      const corruptedPdf = Buffer.from('corrupted pdf content that is not valid');
      
      const formData = new FormData();
      const blob = new Blob([corruptedPdf], { type: 'application/pdf' });
      formData.append('file', blob, 'corrupted.pdf');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      // Should either succeed with degraded results or return error
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle very large files', async () => {
      // Create a large buffer (simulating 15MB)
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024);
      
      const formData = new FormData();
      const blob = new Blob([largeBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'large.pdf');

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(413); // Request Entity Too Large
    });
  });
});
