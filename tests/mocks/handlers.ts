import { http, HttpResponse, delay } from 'msw';
import { setupWorker } from 'msw/browser';

export interface MockResume {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory "database" for testing
const resumes: Map<string, MockResume> = new Map();
let nextId = 1;

const handlers = [
  // Get all resumes
  http.get('/api/v1/resumes', async () => {
    await delay(100);
    const allResumes = Array.from(resumes.values());
    return HttpResponse.json(allResumes);
  }),

  // Get single resume
  http.get('/api/v1/resumes/:id', async ({ params }) => {
    await delay(100);
    const resume = resumes.get(params.id as string);
    if (!resume) {
      return HttpResponse.json({ error: 'Resume not found' }, { status: 404 });
    }
    return HttpResponse.json(resume);
  }),

  // Create resume
  http.post('/api/v1/resumes', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as Partial<MockResume>;
    const id = `resume-${nextId++}`;
    const now = new Date().toISOString();
    const resume: MockResume = {
      id,
      title: body.title || 'Untitled',
      content: body.content || '',
      createdAt: now,
      updatedAt: now,
    };
    resumes.set(id, resume);
    return HttpResponse.json(resume, { status: 201 });
  }),

  // Update resume
  http.put('/api/v1/resumes/:id', async ({ params, request }) => {
    await delay(100);
    const existing = resumes.get(params.id as string);
    if (!existing) {
      return HttpResponse.json({ error: 'Resume not found' }, { status: 404 });
    }
    const body = (await request.json()) as Partial<MockResume>;
    const updated: MockResume = {
      ...existing,
      ...body,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    resumes.set(params.id as string, updated);
    return HttpResponse.json(updated);
  }),

  // Delete resume
  http.delete('/api/v1/resumes/:id', async ({ params }) => {
    await delay(100);
    if (!resumes.has(params.id as string)) {
      return HttpResponse.json({ error: 'Resume not found' }, { status: 404 });
    }
    resumes.delete(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  // Clone resume
  http.post('/api/v1/resumes/:id/clone', async ({ params, request }) => {
    await delay(100);
    const original = resumes.get(params.id as string);
    if (!original) {
      return HttpResponse.json({ error: 'Resume not found' }, { status: 404 });
    }
    const body = (await request.json()) as { title?: string };
    const id = `resume-${nextId++}`;
    const now = new Date().toISOString();
    const cloned: MockResume = {
      id,
      title: body.title || `Clone of ${original.title}`,
      content: original.content,
      createdAt: now,
      updatedAt: now,
    };
    resumes.set(id, cloned);
    return HttpResponse.json(cloned, { status: 201 });
  }),

  // Health check
  http.get('/api/v1/health', async () => {
    await delay(50);
    return HttpResponse.json({ status: 'ok' });
  }),

  // PDF generation
  http.post('/api/v1/render/pdf', async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as { resumeId?: string };
    // Return mock PDF data
    return HttpResponse.json({
      pdfUrl: `/api/v1/downloads/${body.resumeId || 'temp'}.pdf`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  }),
];

export const worker = setupWorker(...handlers);

// Helper to reset mock data between tests
export function resetMockData() {
  resumes.clear();
  nextId = 1;
}

// Helper to preload some resumes
export function preloadResumes(count: number) {
  for (let i = 0; i < count; i++) {
    const id = `resume-${nextId++}`;
    const now = new Date().toISOString();
    resumes.set(id, {
      id,
      title: `Test Resume ${i + 1}`,
      content: `Content for test resume ${i + 1}`,
      createdAt: now,
      updatedAt: now,
    });
  }
}
