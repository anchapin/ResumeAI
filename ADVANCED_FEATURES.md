# Advanced Features - ResumeAI

This document describes the advanced features implemented in ResumeAI for Issue #68.

## Table of Contents

1. [Resume Versioning and History Tracking](#resume-versioning-and-history-tracking)
2. [Collaboration Features](#collaboration-features)
3. [Advanced Formatting Options](#advanced-formatting-options)
4. [Multi-Format Export](#multi-format-export)
5. [Bulk Operations](#bulk-operations)
6. [Resume Sharing System](#resume-sharing-system)
7. [Advanced Template Search and Filtering](#advanced-template-search-and-filtering)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Resume Import](#resume-import)
10. [Accessibility Features](#accessibility-features)

---

## Resume Versioning and History Tracking

ResumeAI now supports automatic versioning of resumes, allowing you to track changes and restore previous versions.

### Features

- **Automatic Version Creation**: Every time you save resume data, a new version is automatically created
- **Version History**: View all versions of a resume with timestamps and change descriptions
- **Version Restoration**: Restore any previous version with a single click
- **Change Tracking**: See what sections changed between versions

### API Endpoints

```bash
# List all versions of a resume
GET /resumes/{resume_id}/versions

# Get a specific version
GET /resumes/{resume_id}/versions/{version_id}

# Restore a resume to a previous version
POST /resumes/{resume_id}/versions/{version_id}/restore
```

### Frontend Components

- `VersionHistory.tsx` - Displays version history with restore functionality
- `utils/versioning.ts` - Utility functions for version management

### Usage

```typescript
import { listResumeVersions, restoreResumeVersion } from './utils/api-client';

// List all versions
const versions = await listResumeVersions(resumeId);

// Restore a version
await restoreResumeVersion(resumeId, versionId);
```

---

## Collaboration Features

ResumeAI includes team collaboration features for resume reviews.

### Features

- **Comments**: Add comments to specific sections of a resume
- **Comment Resolution**: Mark comments as resolved when addressed
- **Filtering**: View all comments or only unresolved ones
- **Section-Specific Comments**: Tag comments to specific resume sections

### API Endpoints

```bash
# List comments for a resume
GET /resumes/{resume_id}/comments

# Add a comment
POST /resumes/{resume_id}/comments

# Resolve a comment
PATCH /comments/{comment_id}/resolve
```

### Frontend Components

- `CommentPanel.tsx` - Full-featured comment system

### Usage

```typescript
import {
  listComments,
  createComment,
  resolveComment
} from './utils/api-client';

// List comments
const comments = await listComments(resumeId);

// Add a comment
await createComment(resumeId, {
  author_name: 'John Doe',
  author_email: 'john@example.com',
  content: 'Great resume!',
  section: 'Experience'
});

// Resolve a comment
await resolveComment(commentId);
```

---

## Advanced Formatting Options

Customize the appearance of your resume with advanced formatting options.

### Available Options

- **Font Family**: Choose from Arial, Helvetica, Georgia, Times New Roman, etc.
- **Font Size**: Adjust font size (8-24pt)
- **Line Spacing**: Control line spacing (1.0-2.0)
- **Margins**: Customize top, bottom, left, and right margins
- **Color Theme**: Select from pre-defined color themes
- **Layout**: Choose single-column or double-column layout
- **Section Dividers**: Toggle section dividers on/off
- **Section Order**: Customize the order of resume sections

### API Endpoints

```bash
# Export with custom formatting
POST /v1/render/pdf

# Body includes format_options:
{
  "format_options": {
    "font_family": "Arial",
    "font_size": 11,
    "line_spacing": 1.15,
    "margin_top": 0.5,
    "margin_bottom": 0.5,
    "margin_left": 0.75,
    "margin_right": 0.75,
    "color_theme": "default",
    "layout": "single",
    "show_section_dividers": true,
    "section_order": ["basics", "work", "education", "skills"]
  }
}
```

---

## Multi-Format Export

Export your resume in multiple formats based on your needs.

### Supported Formats

- **PDF**: High-quality PDF with LaTeX rendering
- **HTML**: Web-ready HTML with CSS styling
- **Word (DOCX)**: Microsoft Word compatible format

### Frontend Utilities

```typescript
import {
  exportToPDF,
  exportToHTML,
  exportToWord
} from './utils/export';

// Export to PDF
await exportToPDF(resumeData, formatOptions);

// Export to HTML
await exportToHTML(resumeData, formatOptions);

// Export to Word
await exportToWord(resumeData, formatOptions);
```

---

## Bulk Operations

Perform operations on multiple resumes at once to save time.

### Supported Operations

- **Delete**: Delete multiple resumes
- **Export**: Export multiple resumes in bulk
- **Duplicate**: Create duplicates of multiple resumes
- **Tag**: Add tags to multiple resumes

### API Endpoint

```bash
# Perform bulk operation
POST /resumes/bulk

# Body:
{
  "resume_ids": [1, 2, 3, 4, 5],
  "operation": "delete",  // or "export", "duplicate", "tag"
  "tags": ["important"],  // required for "tag" operation
  "export_format": "pdf"  // required for "export" operation
}
```

### Usage

```typescript
import { bulkOperation } from './utils/api-client';

// Delete multiple resumes
const result = await bulkOperation([1, 2, 3], 'delete');

// Tag multiple resumes
await bulkOperation([1, 2, 3], 'tag', { tags: ['job-search'] });
```

---

## Resume Sharing System

Share your resume with others using secure shareable links.

### Features

- **Permissions Control**: Choose view, comment, or edit permissions
- **Expiration Dates**: Set links to expire after a specified time
- **View Limits**: Limit the number of times a link can be viewed
- **Password Protection**: Optional password protection for shared links
- **Access Tracking**: Track view counts for shared resumes

### API Endpoints

```bash
# Create a share link
POST /resumes/{resume_id}/share

# Access a shared resume
GET /share/{share_token}
```

### Frontend Components

- `ShareDialog.tsx` - Share link creation dialog

### Usage

```typescript
import { shareResume, accessSharedResume } from './utils/api-client';

// Create a share link
const link = await shareResume(resumeId, {
  permissions: 'view',
  expires_at: '2024-12-31T23:59:59Z',
  max_views: 10,
  password: 'secure123'
});

// Access a shared resume
const resume = await accessSharedResume('share_token_here', 'password');
```

---

## Advanced Template Search and Filtering

Find the perfect template for your resume with advanced search and filtering.

### Filter Options

- **Search**: Search by template name or description
- **Tags**: Filter by tags (e.g., "modern", "professional")
- **Category**: Filter by category (e.g., "technical", "creative")
- **Industry**: Filter by industry (e.g., "technology", "finance")
- **Layout**: Filter by layout (single-column, double-column)
- **Color Theme**: Filter by color theme

### Usage

```typescript
import { useVariants } from './hooks/useVariants';

// Get all templates
const { variants, loading } = useVariants();

// Filter templates (client-side for now)
const filtered = variants.filter(v => {
  if (filters.category && v.category !== filters.category) return false;
  if (filters.industry && v.industry !== filters.industry) return false;
  if (filters.layout && v.layout !== filters.layout) return false;
  if (filters.search && !v.name.includes(filters.search)) return false;
  return true;
});
```

---

## Keyboard Shortcuts

Power users can navigate and perform actions quickly using keyboard shortcuts.

### Default Shortcuts

#### File Operations
- `Ctrl+S` - Save resume
- `Ctrl+Shift+S` - Save as draft
- `Ctrl+N` - New resume
- `Ctrl+E` - Export resume
- `Ctrl+I` - Import resume

#### Edit Operations
- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` - Redo
- `Ctrl+F` - Find
- `Ctrl+H` - Replace
- `Ctrl+A` - Select all

#### Navigation
- `Ctrl+/` - Show keyboard shortcuts help
- `Ctrl+Home` - Go to top
- `Ctrl+End` - Go to bottom
- `Ctrl+1` - Go to Dashboard
- `Ctrl+2` - Go to Editor
- `Ctrl+3` - Go to Workspace

#### View
- `Ctrl+P` - Preview resume
- `Ctrl+Shift+P` - Toggle fullscreen
- `Ctrl+Shift+C` - Show version history

#### Actions
- `Ctrl+D` - Duplicate current section
- `Ctrl+K` - Add comment
- `Ctrl+L` - Share resume

#### Accessibility
- `Tab` - Navigate to next field
- `Shift+Tab` - Navigate to previous field
- `Esc` - Close modal/dialog
- `Enter` - Confirm action

### Frontend Components

- `KeyboardShortcutsHelp.tsx` - Keyboard shortcuts help modal
- `utils/shortcuts.ts` - Keyboard shortcut utilities

### Usage

```typescript
import {
  DEFAULT_SHORTCUTS,
  registerShortcuts,
  getShortcutForAction,
  formatShortcutForDisplay
} from './utils/shortcuts';

// Register shortcuts
const cleanup = registerShortcuts(DEFAULT_SHORTCUTS, (action, event) => {
  console.log('Shortcut triggered:', action);
  // Handle the action
});

// Get shortcut for an action
const shortcut = getShortcutForAction('Save resume');

// Format for display (adapts to Mac/Windows)
const formatted = formatShortcutForDisplay('Ctrl+S'); // Returns '⌘S' on Mac

// Cleanup when component unmounts
cleanup();
```

---

## Resume Import

Import resumes from various formats to get started quickly.

### Supported Formats

- **JSON Resume**: Import from JSON Resume format
- **PDF**: Import from PDF files (backend processing required)
- **Word (DOCX)**: Import from Word documents (backend processing required)
- **LinkedIn**: Import from LinkedIn profiles (backend processing required)

### Frontend Utilities

```typescript
import {
  importFromJSON,
  importFromPDF,
  importFromWord,
  importFromLinkedIn,
  validateImportedData,
  detectFileFormat
} from './utils/import';

// Import from JSON
const resumeData = await importFromJSON(jsonString);

// Import from file
const file = event.target.files[0];
const format = detectFileFormat(file.name);

if (format === 'pdf') {
  const data = await importFromPDF(file);
} else if (format === 'docx') {
  const data = await importFromWord(file);
} else if (format === 'json') {
  const text = await file.text();
  const data = await importFromJSON(text);
}

// Validate imported data
const validation = validateImportedData(data);
if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

---

## Accessibility Features

ResumeAI includes accessibility features for users with disabilities.

### Features

- **Keyboard Navigation**: Full keyboard navigation support
- **ARIA Labels**: Proper ARIA labels on all interactive elements
- **Screen Reader Support**: Optimized for screen readers
- **Focus Management**: Proper focus management for modals and dialogs
- **High Contrast Mode**: Option for high contrast color scheme
- **Reduced Motion**: Option to disable animations
- **Focus Indicators**: Clear focus indicators for keyboard users

### User Settings

```typescript
import { getUserSettings, updateUserSettings } from './utils/api-client';

// Get user settings
const settings = await getUserSettings('user@example.com');

// Update accessibility settings
await updateUserSettings('user@example.com', {
  high_contrast_mode: true,
  reduced_motion: true,
  screen_reader_optimized: true,
  keyboard_shortcuts_enabled: true
});
```

### Accessibility Best Practices

- All interactive elements are keyboard accessible
- Form labels are properly associated with inputs
- Color contrast ratios meet WCAG AA standards (minimum 4.5:1)
- Focus indicators are visible on all focusable elements
- Modal dialogs trap focus when open
- Error messages are announced to screen readers
- Skip links provided to jump to main content

---

## API Reference

### Base URL

```
http://127.0.0.1:8000 (development)
https://api.resumeai.com (production)
```

### Authentication

All API endpoints (except public share access) require an API key:

```http
X-API-KEY: your_api_key_here
```

### Response Formats

All API responses use JSON format:

```json
{
  "id": 1,
  "title": "My Resume",
  "data": { ... },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Error Responses

```json
{
  "error": "Not Found",
  "detail": "Resume with ID 999 not found"
}
```

---

## Frontend Implementation Notes

### State Management

The advanced features use React hooks for state management:
- `useState` for local component state
- `useEffect` for side effects and API calls
- `useCallback` for memoized callbacks

### API Client

All API calls are centralized in `utils/api-client.ts`:
- Consistent error handling
- Automatic API key injection
- TypeScript type safety

### Component Structure

Components are organized by feature:
- `/components` - Reusable UI components
- `/pages` - Full page components
- `/utils` - Utility functions and helpers
- `/hooks` - Custom React hooks

---

## Future Enhancements

Planned improvements for advanced features:

1. **Real-time Collaboration**: WebSockets for real-time editing
2. **More Import Formats**: Support for additional resume formats
3. **Advanced Analytics**: Detailed usage analytics and insights
4. **Template Editor**: Visual template customization tool
5. **AI-Powered Suggestions**: Smart recommendations based on job descriptions
6. **Team Management**: Full team and permission management
7. **Version Comparison**: Side-by-side version comparison
8. **Export Templates**: Custom export templates

---

## Support

For questions or issues with advanced features:

1. Check the API documentation at `/docs` endpoint
2. Review this documentation
3. Check existing GitHub issues
4. Create a new issue if needed

---

## Changelog

### Version 1.0.0 (2024-02-14)

**Initial Implementation**

- Resume versioning and history tracking
- Collaboration features with comments
- Advanced formatting options
- Multi-format export (PDF, HTML, Word)
- Bulk operations
- Resume sharing system
- Keyboard shortcuts
- Resume import from multiple formats
- Accessibility features
