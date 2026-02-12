# localStorage Persistence Implementation

This document describes the implementation of client-side persistence using `localStorage` for the ResumeAI application.

## Overview

The implementation automatically saves and loads the user's Master Profile (Resume Data) to `localStorage`, ensuring that data persists across page refreshes and browser sessions.

## Architecture

### Storage Utility (`utils/storage.ts`)

A comprehensive utility module that handles all storage operations:

#### Functions

- **`saveResumeData(data: ResumeData)`** - Saves resume data to localStorage
- **`loadResumeData(): ResumeData | null`** - Loads resume data from localStorage
- **`clearResumeData()`** - Clears all saved resume data
- **`hasSavedResumeData(): boolean`** - Checks if saved data exists
- **`getStoredDataSize(): number`** - Returns the size of stored data in bytes

#### Error Handling

The implementation includes robust error handling for:
- **Quota exceeded** - When localStorage is full
- **Parse errors** - When stored data is corrupted
- **Access denied** - When localStorage is blocked
- **Not available** - When running in environments without localStorage

All errors are caught and user-friendly messages are displayed in the UI.

### Integration Points

#### App.tsx

- **On Mount**: Automatically loads saved resume data from localStorage
- **On Change**: Automatically saves resume data to localStorage when it changes
- **Loading State**: Shows a loading indicator while data is being loaded
- **Error Notifications**: Displays toast notifications for storage errors

#### Editor.tsx

- **Auto-save indicator**: Shows "Last saved X minutes ago" to give users feedback about persistence

### Data Validation

The storage utility validates loaded data to ensure:
- Required fields (`name`, `email`, `experience`) exist
- `experience` is an array
- Data structure matches expected schema

## Storage Key

The resume data is stored under the key: `resumeai_master_profile`

## Browser Compatibility

- Works in all modern browsers that support localStorage
- Gracefully degrades in environments without localStorage
- Handles private browsing mode limitations

## Security Considerations

- Data is stored in plain text (JSON) in localStorage
- No sensitive credentials should be stored in resume data
- Data is accessible via JavaScript in the same domain
- For production use with sensitive data, consider encryption or server-side storage

## Storage Limits

- localStorage typically has a limit of 5-10 MB per domain
- The resume data size is monitored via `getStoredDataSize()`
- Quota exceeded errors are caught and reported to users

## Usage Example

```typescript
import { saveResumeData, loadResumeData, clearResumeData } from './utils/storage';

// Save data
saveResumeData(resumeData);

// Load data
const savedData = loadResumeData();
if (savedData) {
  // Use the saved data
}

// Clear data
clearResumeData();
```

## Testing

A test utility is provided in `utils/storage.test.ts` that can be run in the browser console:

```javascript
runStorageTests();
```

This will test all storage operations and verify data integrity.

## Error Messages

| Error Type | Message |
|------------|---------|
| QUOTA_EXCEEDED | "Storage full. Please clear some browser data." |
| PARSE_ERROR | "Data corrupted. Using default resume." |
| ACCESS_DENIED | "Storage access denied. Changes won't be saved." |
| NOT_AVAILABLE | "Storage not available. Changes won't be saved." |
| UNKNOWN | "Failed to save data. Please try again." |

## Future Enhancements

Potential improvements for the persistence layer:

1. **IndexedDB migration** - For very large datasets or when localStorage quota is exceeded
2. **Data encryption** - For enhanced security
3. **Auto-save debouncing** - To reduce write frequency (currently implemented with 500ms debounce in Editor)
4. **Backup/Restore** - Export/import functionality for data portability
5. **Versioning** - Schema versioning to handle data structure changes
6. **Conflict resolution** - For multi-tab editing scenarios
7. **Session storage** - For temporary data that should be cleared on tab close

## Implementation Checklist (Issue #16)

- [x] Choose between localStorage and IndexedDB for storage
- [x] Create utility functions for saving/loading resume data
- [x] Integrate persistence into Editor.tsx and App.tsx
- [x] Add error handling for storage failures (e.g., quota exceeded)
- [x] Test data persistence across page refreshes

## Acceptance Criteria Met

- [x] User's resume data persists after page refresh
- [x] Data loads automatically on app start
- [x] Handles storage errors gracefully
- [x] No data loss scenarios identified
