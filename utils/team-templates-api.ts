import { API_URL } from './config';

export interface TeamTemplate {
  id: number;
  team_id: number;
  team_name: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  data: Record<string, unknown>;
  is_public: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateCreate {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  resume_id?: number;
  data?: Record<string, unknown>;
  is_public?: boolean;
}

export interface TemplateUpdate {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface APIError {
  message: string;
  status?: number;
}

/**
 * Get API key from localStorage.
 */
function getApiKey(): string | null {
  return localStorage.getItem('api_key');
}

/**
 * Get headers for API requests.
 */
function getHeaders(): HeadersInit {
  const apiKey = getApiKey();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}

/**
 * List templates.
 */
export async function listTemplates(
  teamId?: number,
  category?: string,
  search?: string
): Promise<TeamTemplate[]> {
  const params = new URLSearchParams();
  if (teamId) params.set('team_id', teamId.toString());
  if (category) params.set('category', category);
  if (search) params.set('search', search);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_URL}/api/v1/templates${queryString}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list templates: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get a specific template.
 */
export async function getTemplate(id: number): Promise<TeamTemplate> {
  const response = await fetch(`${API_URL}/api/v1/templates/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get template: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a new template.
 */
export async function createTemplate(data: TemplateCreate): Promise<TeamTemplate> {
  const response = await fetch(`${API_URL}/api/v1/templates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to create template: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update a template.
 */
export async function updateTemplate(id: number, data: TemplateUpdate): Promise<TeamTemplate> {
  const response = await fetch(`${API_URL}/api/v1/templates/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to update template: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete a template.
 */
export async function deleteTemplate(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/templates/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to delete template: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * List template categories.
 */
export async function listTemplateCategories(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/v1/templates/categories`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list categories: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * List template tags.
 */
export async function listTemplateTags(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/v1/templates/tags`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list tags: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a template from a resume.
 */
export async function createTemplateFromResume(
  resumeId: number,
  name: string,
  description?: string,
  category?: string
): Promise<TeamTemplate> {
  return createTemplate({
    name,
    description,
    category,
    resume_id: resumeId,
  });
}
