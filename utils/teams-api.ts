import { API_URL } from './config';

export interface Team {
  id: number;
  name: string;
  description?: string | null;
  owner_id: number;
  is_private: boolean;
  allow_member_invites: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  current_user_role?: string;
}

export interface TeamMember {
  id: number;
  user_id: number;
  team_id: number;
  role: string;
  joined_at: string;
}

export interface TeamInvitation {
  id: number;
  email: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  expires_at: string;
  invited_at: string;
}

export interface ResumeShare {
  id: number;
  resume_id: number;
  team_id: number;
  team_name: string;
  permission: 'view' | 'edit' | 'comment';
  shared_at: string;
}

export interface TeamCreate {
  name: string;
  description?: string;
  is_private?: boolean;
  allow_member_invites?: boolean;
}

export interface TeamUpdate {
  name?: string;
  description?: string;
  is_private?: boolean;
  allow_member_invites?: boolean;
}

export interface ResumeShareCreate {
  team_id: number;
  permission?: 'view' | 'edit' | 'comment';
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
 * List all teams the current user is a member of.
 */
export async function listTeams(): Promise<Team[]> {
  const response = await fetch(`${API_URL}/api/v1/teams`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list teams: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get a specific team by ID.
 */
export async function getTeam(id: number): Promise<Team> {
  const response = await fetch(`${API_URL}/api/v1/teams/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get team: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a new team.
 */
export async function createTeam(data: TeamCreate): Promise<Team> {
  const response = await fetch(`${API_URL}/api/v1/teams`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to create team: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update a team.
 */
export async function updateTeam(id: number, data: TeamUpdate): Promise<Team> {
  const response = await fetch(`${API_URL}/api/v1/teams/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to update team: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete a team.
 */
export async function deleteTeam(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/teams/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to delete team: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * List team members.
 */
export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
  const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list members: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Remove a team member.
 */
export async function removeTeamMember(teamId: number, userId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to remove member: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * Invite someone to a team.
 */
export async function inviteToTeam(teamId: number, email: string): Promise<TeamInvitation> {
  const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/invite`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to send invitation: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * List pending team invitations.
 */
export async function listTeamInvitations(teamId: number): Promise<TeamInvitation[]> {
  const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/invitations`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list invitations: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Accept a team invitation.
 */
export async function acceptInvitation(token: string): Promise<Team> {
  const response = await fetch(`${API_URL}/api/v1/teams/invitations/${token}/accept`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to accept invitation: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Cancel a team invitation.
 */
export async function cancelInvitation(invitationId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/teams/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to cancel invitation: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * Share a resume with a team.
 */
export async function shareResumeWithTeam(resumeId: number, data: ResumeShareCreate): Promise<ResumeShare> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/share`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to share resume: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get resume shares.
 */
export async function getResumeShares(resumeId: number): Promise<ResumeShare[]> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/shares`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get shares: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update resume share permission.
 */
export async function updateResumeShare(resumeId: number, shareId: number, permission: 'view' | 'edit' | 'comment'): Promise<ResumeShare> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/shares/${shareId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ permission }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to update share: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Remove resume share.
 */
export async function removeResumeShare(resumeId: number, shareId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/shares/${shareId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to remove share: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * List team resumes.
 */
export async function listTeamResumes(teamId: number, permission?: string): Promise<any[]> {
  const params = permission ? `?permission=${permission}` : '';
  const response = await fetch(`${API_URL}/api/v1/resumes/teams/${teamId}${params}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list team resumes: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
