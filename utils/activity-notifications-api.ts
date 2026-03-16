import { API_URL } from './config';

export interface Activity {
  id: number;
  team_id: number;
  team_name: string;
  user_id: number;
  user_name: string;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  resource_type: string | null;
  resource_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  email_comments: boolean;
  email_mentions: boolean;
  email_shares: boolean;
  email_invites: boolean;
  in_app_comments: boolean;
  in_app_mentions: boolean;
  in_app_shares: boolean;
  in_app_invites: boolean;
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
 * Get team activity feed.
 */
export async function getTeamActivity(
  teamId: number,
  limit = 50
): Promise<Activity[]> {
  const response = await fetch(
    `${API_URL}/api/v1/teams/${teamId}/activity?limit=${limit}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get activity: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get user notifications.
 */
export async function getNotifications(
  unreadOnly = false,
  limit = 50
): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set('unread_only', 'true');
  params.set('limit', limit.toString());

  const response = await fetch(
    `${API_URL}/api/v1/notifications?${params.toString()}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get notifications: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get unread notification count.
 */
export async function getUnreadNotificationCount(): Promise<{ unread_count: number }> {
  const response = await fetch(`${API_URL}/api/v1/notifications/unread/count`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get unread count: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Mark notification as read.
 */
export async function markNotificationAsRead(notificationId: number): Promise<Notification> {
  const response = await fetch(
    `${API_URL}/api/v1/notifications/${notificationId}/read`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to mark as read: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/notifications/read-all`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to mark all as read: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * Delete a notification.
 */
export async function deleteNotification(notificationId: number): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/v1/notifications/${notificationId}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to delete notification: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * Get notification preferences.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await fetch(`${API_URL}/api/v1/notifications/preferences`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get preferences: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update notification preferences.
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  const response = await fetch(`${API_URL}/api/v1/notifications/preferences`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to update preferences: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
