# Phase 7: Manual Tailoring Editor - User Guide

**Version:** 1.0
**Last Updated:** 2026-03-12

---

## Overview

The Manual Tailoring Editor gives you complete control over your resume content with AI-powered suggestions, version history, and rich text editing capabilities.

---

## Features

### 1. Rich Text Editing ✏️

Format your resume content with professional styling:

**Available Formatting:**
- **Bold** (Ctrl+B) - Emphasize important achievements
- *Italic* (Ctrl+I) - Add subtle emphasis
- <u>Underline</u> (Ctrl+U) - Highlight key information
- ~~Strikethrough~~ - Mark removed content
- Headings (H1, H2, H3) - Organize sections
- Bullet lists - List achievements clearly
- Numbered lists - Show sequential information
- Inline code - Display technical skills

**Where to Use:**
- Professional Summary
- Work Experience descriptions
- Education details
- Project descriptions
- Cover Letter content

---

### 2. AI Tailoring with Change Tracking 🤖

Get intelligent suggestions to match your resume to job descriptions:

**How It Works:**
1. Add a job description in the Job Description input
2. Click "Tailor Resume" to analyze
3. Review AI suggestions with blue highlights
4. Accept or reject each change individually
5. Toggle AI suggestions on/off as needed

**Visual Indicators:**
- 🔵 **Blue highlight** - AI-suggested changes
- 🟢 **Green highlight** - Your manual edits
- 🔴 **Red strikethrough** - Rejected changes

**AI Suggestion Toggle:**
- Click the **lightbulb icon** (AI On/AI Off) in the toolbar
- When OFF: AI highlights are hidden for clean viewing
- When ON: All AI suggestions are visible

---

### 3. Version History & Undo/Redo ⏪

Never lose your work with comprehensive version control:

**Undo/Redo:**
- **Undo** (Ctrl+Z) - Reverse your last change
- **Redo** (Ctrl+Y or Ctrl+Shift+Z) - Re-apply undone change
- Buttons in toolbar show availability (grayed out when unavailable)

**Version Snapshots:**
- **Automatic snapshots** created before:
  - AI tailoring operations
  - Cover letter generation
  - Version restore operations
- **Manual snapshots** - Click "Save Version" to capture current state

**Version History Panel:**
1. Click "History" button in toolbar
2. See all saved versions with timestamps
3. Click "Restore" on any previous version
4. A snapshot is automatically created before restore (safety backup)

---

### 4. Cover Letter Editor 📝

Create professional cover letters with the same rich text capabilities:

**Features:**
- Rich text formatting (same as resume editor)
- Tone selection (Formal, Conversational, Enthusiastic)
- Company name and hiring manager fields
- AI generation from job description
- Export to PDF, DOCX, TXT, or Markdown

**How to Generate:**
1. Navigate to "Cover Letter" tab
2. Enter company name (optional: hiring manager)
3. Select desired tone
4. Click "Generate Cover Letter"
5. Edit content as needed
6. Export in your preferred format

---

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Y or Ctrl+Shift+Z | Cmd+Y or Cmd+Shift+Z |
| Bold | Ctrl+B | Cmd+B |
| Italic | Ctrl+I | Cmd+I |
| Underline | Ctrl+U | Cmd+U |
| Toggle AI Suggestions | (Coming soon) | (Coming soon) |

---

## Best Practices

### For AI Tailoring

1. **Review all suggestions** - AI isn't perfect; always review before accepting
2. **Use the toggle** - Turn AI highlights off to see the clean version
3. **Accept selectively** - You don't have to accept all suggestions
4. **Save before major changes** - Create a manual version snapshot first

### For Version Control

1. **Save versions frequently** - Before major edits, save a version
2. **Use descriptive names** - "Before adding new job" is better than "Version 3"
3. **Restore confidently** - Every restore creates a safety backup
4. **Clean up old versions** - Periodically remove outdated snapshots

### For Rich Text Editing

1. **Use headings sparingly** - H1 for section titles, H2/H3 for subsections
2. **Consistent formatting** - Keep bullet style consistent throughout
3. **Don't over-format** - Use bold for emphasis, not entire paragraphs
4. **Preview before export** - Always check how formatting looks in preview

---

## Troubleshooting

### AI Suggestions Not Appearing

**Problem:** No blue highlights showing after AI tailoring

**Solutions:**
1. Check if AI toggle is set to "AI Off" - click to turn on
2. Verify job description was provided
3. Try regenerating suggestions
4. Check browser console for errors

### Version History Not Saving

**Problem:** Versions not appearing in history panel

**Solutions:**
1. Check localStorage quota (may be full)
2. Clear browser cache and try again
3. Ensure you're logged in (if applicable)
4. Try manual version save

### Formatting Lost on Export

**Problem:** PDF/DOCX doesn't show formatting

**Solutions:**
1. Preview before exporting to verify formatting
2. Try a different export format
3. Check if content is too long (may need pagination)
4. Refresh page and try again

### Editor Not Responding

**Problem:** Typing lag or unresponsive editor

**Solutions:**
1. Refresh the page (content auto-saves)
2. Close other browser tabs (free up memory)
3. Check internet connection (if using cloud sync)
4. Try a different browser

---

## Accessibility

The Manual Tailoring Editor is designed for accessibility:

**Keyboard Navigation:**
- All features accessible via keyboard
- Tab through toolbar buttons
- Enter to activate, Esc to cancel
- Focus indicators on all interactive elements

**Screen Reader Support:**
- ARIA labels on all buttons
- Announcements for formatting changes
- Descriptive labels for form inputs

**Visual Accessibility:**
- High contrast mode compatible
- Resizable text (browser zoom)
- Color-blind friendly indicators (blue/green have different patterns)

---

## Mobile Support

The editor works on mobile devices with touch-optimized controls:

**Mobile Features:**
- Touch-friendly button sizes (minimum 44px)
- Responsive toolbar (wraps on small screens)
- Mobile keyboard compatible
- Swipe gestures for undo/redo (coming soon)

**Recommended Devices:**
- iPhone SE or larger
- iPad (all models)
- Android phones (720p or higher)
- Android tablets

---

## Data Privacy

**Where Your Data is Stored:**
- Resume content: LocalStorage (your browser)
- Version history: LocalStorage (your browser)
- AI suggestions: Processed server-side, not stored

**Data Retention:**
- LocalStorage persists until cleared
- Clear browser data to remove all content
- No server-side storage of resume content

**Security:**
- No sensitive data in URLs
- HTTPS encryption for AI operations
- No third-party tracking in editor

---

## Getting Help

**Documentation:**
- This user guide
- In-app tooltips (hover over buttons)
- Help modal (coming soon)

**Support:**
- Report bugs via GitHub Issues
- Feature requests welcome
- Community forum (coming soon)

---

## Changelog

### Version 1.0 (2026-03-12)

**Initial Release:**
- Rich text editor with full formatting
- AI tailoring with change tracking
- Version history with undo/redo
- Cover letter editor
- Show/hide AI suggestions toggle
- Mobile responsive design
- Accessibility compliant (WCAG 2.1 AA)

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│           MANUAL TAILORING EDITOR QUICK REFERENCE       │
├─────────────────────────────────────────────────────────┤
│  FORMATTING                                             │
│  B: Bold    I: Italic    U: Underline                   │
│  H1/H2/H3: Headings                                     │
│  Lists: Bullet or Numbered                              │
├─────────────────────────────────────────────────────────┤
│  VERSION CONTROL                                        │
│  Ctrl+Z: Undo        Ctrl+Y: Redo                       │
│  History: View all versions                             │
│  Save Version: Create snapshot                          │
├─────────────────────────────────────────────────────────┤
│  AI TAILORERING                                         │
│  💡 AI On/Off: Toggle highlights                        │
│  ✓ Accept: Apply suggestion                             │
│  ✗ Reject: Discard suggestion                           │
├─────────────────────────────────────────────────────────┤
│  COLORS                                                 │
│  🔵 Blue: AI suggestions                                │
│  🟢 Green: Manual edits                                 │
│  🔴 Red: Rejected changes                               │
└─────────────────────────────────────────────────────────┘
```

---

**End of User Guide**

For technical documentation, see the developer README.
