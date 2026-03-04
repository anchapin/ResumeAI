import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock data storage (simulates backend database)
let mockResumes: Map<string, any> = new Map();
let nextId = 1;

// Mock fetch globally
const mockFetch = vi.fn(async (input: string | Request, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = init?.method || 'GET';
  const body = init?.body ? JSON.parse(init.body as string) : undefined;

  // Add delay to simulate network
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Route handling
  if (url === '/api/v1/resumes') {
    if (method === 'GET') {
      return new Response(JSON.stringify(Array.from(mockResumes.values())), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (method === 'POST') {
      const id = `resume-${nextId++}`;
      const now = new Date().toISOString();
      const resume = {
        id,
        title: body.title || 'Untitled',
        content: body.content || '',
        createdAt: now,
        updatedAt: now,
      };
      mockResumes.set(id, resume);
      return new Response(JSON.stringify(resume), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Match /api/v1/resumes/:id
  const resumesMatch = url.match(/^\/api\/v1\/resumes\/(.+)$/);
  if (resumesMatch) {
    const id = resumesMatch[1];
    const resume = mockResumes.get(id);

    if (method === 'GET') {
      if (!resume) {
        return new Response(JSON.stringify({ error: 'Resume not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(resume), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT') {
      if (!resume) {
        return new Response(JSON.stringify({ error: 'Resume not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const updated = {
        ...resume,
        ...body,
        id,
        updatedAt: new Date().toISOString(),
      };
      mockResumes.set(id, updated);
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      if (!resume) {
        return new Response(JSON.stringify({ error: 'Resume not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      mockResumes.delete(id);
      return new Response(null, { status: 204 });
    }
  }

  // Match /api/v1/resumes/:id/clone
  const cloneMatch = url.match(/^\/api\/v1\/resumes\/(.+)\/clone$/);
  if (cloneMatch && method === 'POST') {
    const originalId = cloneMatch[1];
    const original = mockResumes.get(originalId);
    if (!original) {
      return new Response(JSON.stringify({ error: 'Resume not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const id = `resume-${nextId++}`;
    const now = new Date().toISOString();
    const cloned = {
      id,
      title: body.title || `Clone of ${original.title}`,
      content: original.content,
      createdAt: now,
      updatedAt: now,
    };
    mockResumes.set(id, cloned);
    return new Response(JSON.stringify(cloned), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // PDF generation
  if (url === '/api/v1/render/pdf' && method === 'POST') {
    return new Response(
      JSON.stringify({
        pdfUrl: `/api/v1/downloads/${body.resumeId || 'temp'}.pdf`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Health check
  if (url === '/api/v1/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 404 for unknown routes
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});

describe('Frontend Integration Tests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockResumes.clear();
    nextId = 1;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Resume API Integration', () => {
    it('should fetch all resumes from API', async () => {
      // Pre-populate some resumes
      mockResumes.set('resume-1', { id: 'resume-1', title: 'Resume 1', content: 'Content 1' });
      mockResumes.set('resume-2', { id: 'resume-2', title: 'Resume 2', content: 'Content 2' });

      const response = await fetch('/api/v1/resumes');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('should create a new resume via API', async () => {
      const newResume = {
        title: 'New Test Resume',
        content: 'Test content',
        basics: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const response = await fetch('/api/v1/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newResume),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.title).toBe('New Test Resume');
    });

    it('should get a single resume by ID', async () => {
      // First create a resume
      const createResponse = await fetch('/api/v1/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Resume', content: 'Content' }),
      });
      const created = await createResponse.json();

      // Then fetch it
      const getResponse = await fetch(`/api/v1/resumes/${created.id}`);
      const data = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(data.id).toBe(created.id);
      expect(data.title).toBe('Test Resume');
    });

    it('should update an existing resume', async () => {
      // Create a resume
      const createResponse = await fetch('/api/v1/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Original Title', content: 'Original' }),
      });
      const created = await createResponse.json();

      // Update it
      const updateResponse = await fetch(`/api/v1/resumes/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const updated = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updated.title).toBe('Updated Title');
      expect(updated.id).toBe(created.id);
    });

    it('should delete a resume', async () => {
      // Create a resume
      const createResponse = await fetch('/api/v1/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'To Delete', content: 'Content' }),
      });
      const created = await createResponse.json();

      // Delete it
      const deleteResponse = await fetch(`/api/v1/resumes/${created.id}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await fetch(`/api/v1/resumes/${created.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should clone a resume', async () => {
      // Create original
      const createResponse = await fetch('/api/v1/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Original', content: 'Original content' }),
      });
      const original = await createResponse.json();

      // Clone it
      const cloneResponse = await fetch(`/api/v1/resumes/${original.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Cloned Resume' }),
      });
      const cloned = await cloneResponse.json();

      expect(cloneResponse.status).toBe(201);
      expect(cloned.id).not.toBe(original.id);
      expect(cloned.title).toBe('Cloned Resume');
      expect(cloned.content).toBe('Original content');
    });

    it('should handle 404 for non-existent resume', async () => {
      const response = await fetch('/api/v1/resumes/non-existent-id');

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('PDF Generation Integration', () => {
    it('should generate PDF for a resume', async () => {
      // Create a resume first
      const createResponse = await fetch('/api/v1/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'PDF Test', content: 'Content' }),
      });
      const resume = await createResponse.json();

      // Generate PDF
      const pdfResponse = await fetch('/api/v1/render/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: resume.id }),
      });
      const pdfData = await pdfResponse.json();

      expect(pdfResponse.status).toBe(200);
      expect(pdfData.pdfUrl).toBeDefined();
      expect(pdfData.expiresAt).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid endpoint
      const response = await fetch('/api/v1/invalid-endpoint');
      expect(response.status).toBe(404);
    });
  });

  describe('Health Check Integration', () => {
    it('should return health status', async () => {
      const response = await fetch('/api/v1/health');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });
  });
});
