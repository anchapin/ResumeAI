/**
 * Test retry logic integration in API client
 * Simulates network failures to verify retry behavior
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createResume, getResume, listResumes, deleteResume } from './api-client';
import { ResumeData } from '../types';

describe('API Client - Retry Logic Integration', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
    localStorage.setItem('RESUMEAI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('createResume with retry', () => {
    it('retries on 503 Service Unavailable', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Service Unavailable' }), { status: 503 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Service Unavailable' }), { status: 503 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1, title: 'Test Resume' }), { status: 200 }),
        );

      const testData: ResumeData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '',
        location: '',
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
      };

      const result = await createResume('Test Resume', testData);

      expect(result.id).toBe(1);
      expect(fetchSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('retries on network error', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 2, title: 'Another Resume' }), { status: 200 }),
        );

      const testData: ResumeData = {
        name: 'Test User 2',
        email: 'test2@example.com',
        phone: '',
        location: '',
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
      };

      const result = await createResume('Another Resume', testData);

      expect(result.id).toBe(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('getResume with retry', () => {
    it('succeeds after retry on 502 Bad Gateway', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Bad Gateway' }), { status: 502 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1, title: 'Retrieved Resume' }), { status: 200 }),
        );

      const result = await getResume(1);

      expect(result.title).toBe('Retrieved Resume');
      expect(fetchSpy).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('retries on rate limiting (429)', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Too Many Requests' }), { status: 429 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Too Many Requests' }), { status: 429 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 3, title: 'Rate Limited Resume' }), { status: 200 }),
        );

      const result = await getResume(3);

      expect(result.title).toBe('Rate Limited Resume');
      expect(fetchSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('listResumes with retry', () => {
    it('retries on 500 Internal Server Error', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Internal Server Error' }), { status: 500 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 }),
        );

      const result = await listResumes();

      expect(result).toHaveLength(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('deleteResume with retry', () => {
    it('retries on 504 Gateway Timeout', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Gateway Timeout' }), { status: 504 }),
        )
        .mockResolvedValueOnce(new Response('', { status: 204 }));

      await deleteResume(1);

      expect(fetchSpy).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('retries on 408 Request Timeout', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'Request Timeout' }), { status: 408 }),
        )
        .mockResolvedValueOnce(new Response('', { status: 204 }));

      await deleteResume(2);

      expect(fetchSpy).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });
});
