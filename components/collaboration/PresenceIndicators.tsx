import React from 'react';
import { PresenceInfo } from '../../utils/collaboration';

interface PresenceIndicatorsProps {
  presences: PresenceInfo[];
  currentUserId?: string;
}

export const PresenceIndicators: React.FC<PresenceIndicatorsProps> = ({
  presences,
  currentUserId,
}) => {
  // Filter out current user and get unique users
  const otherUsers = presences.filter((p) => p.user_id !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-500">
        {otherUsers.length} {otherUsers.length === 1 ? 'other' : 'others'} viewing:
      </span>
      <div className="flex -space-x-2">
        {otherUsers.map((presence) => (
          <PresenceAvatar key={presence.connection_id} presence={presence} />
        ))}
      </div>
    </div>
  );
};

interface PresenceAvatarProps {
  presence: PresenceInfo;
}

const PresenceAvatar: React.FC<PresenceAvatarProps> = ({ presence }) => {
  const initials = presence.user_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
      style={{ backgroundColor: presence.color }}
      title={`${presence.user_name}${presence.is_editing ? ' (editing)' : ''}`}
    >
      {initials}
    </div>
  );
};

interface CursorPresenceProps {
  presences: PresenceInfo[];
  currentUserId?: string;
}

export const CursorPresence: React.FC<CursorPresenceProps> = ({
  presences,
  currentUserId,
}) => {
  const otherUsers = presences.filter(
    (p) => p.user_id !== currentUserId && p.cursor_position && p.active_section
  );

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {otherUsers.map((presence) => {
        if (!presence.cursor_position) return null;

        return (
          <CursorIndicator
            key={presence.connection_id}
            presence={presence}
            cursorPosition={presence.cursor_position}
          />
        );
      })}
    </div>
  );
};

interface CursorIndicatorProps {
  presence: PresenceInfo;
  cursorPosition: { line: number; column: number };
}

const CursorIndicator: React.FC<CursorIndicatorProps> = ({
  presence,
  cursorPosition,
}) => {
  // Convert line/column to pixel position (simplified - would need actual editor integration)
  const top = cursorPosition.line * 24; // Approximate line height
  const left = cursorPosition.column * 8; // Approximate character width

  return (
    <div
      className="absolute z-10 transition-all duration-150"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 h-5"
        style={{ backgroundColor: presence.color }}
      />
      {/* Cursor label */}
      <div
        className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: presence.color }}
      >
        {presence.user_name}
      </div>
    </div>
  );
};

interface SectionLockIndicatorProps {
  section: string;
  lockedBy: string;
  userColor: string;
  onRelease?: () => void;
  isCurrentUser: boolean;
}

export const SectionLockIndicator: React.FC<SectionLockIndicatorProps> = ({
  section,
  lockedBy,
  userColor,
  onRelease,
  isCurrentUser,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center space-x-2">
        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-sm text-yellow-800">
          {isCurrentUser ? (
            <>
              You are editing <strong className="font-medium">{section}</strong>
            </>
          ) : (
            <>
              <strong className="font-medium" style={{ color: userColor }}>{lockedBy}</strong> is editing{' '}
              <strong className="font-medium">{section}</strong>
            </>
          )}
        </span>
      </div>
      {isCurrentUser && onRelease && (
        <button
          onClick={onRelease}
          className="px-2 py-1 text-xs text-yellow-700 hover:text-yellow-900 font-medium"
        >
          Done Editing
        </button>
      )}
    </div>
  );
};

interface ActiveEditorsPanelProps {
  presences: PresenceInfo[];
  currentUserId?: string;
}

export const ActiveEditorsPanel: React.FC<ActiveEditorsPanelProps> = ({
  presences,
  currentUserId,
}) => {
  const otherUsers = presences.filter((p) => p.user_id !== currentUserId);

  if (otherUsers.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        No other users currently viewing
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Active Editors ({otherUsers.length})
      </h3>
      <div className="space-y-2">
        {otherUsers.map((presence) => (
          <div
            key={presence.connection_id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: presence.color }}
              />
              <span className="text-sm font-medium text-gray-900">
                {presence.user_name}
              </span>
            </div>
            {presence.is_editing ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Editing {presence.active_section || 'resume'}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                Viewing
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
