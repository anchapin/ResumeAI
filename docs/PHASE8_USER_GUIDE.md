# Phase 8: Export Enhancements - User Guide

**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Status:** Plans 01 & 02 Complete

---

## Overview

Phase 8 introduces advanced export formats beyond PDF/DOCX, providing flexible options for different use cases including web portfolios, developer workflows, and version control.

---

## Export Formats

### JSON Export (NEW)

**Perfect for:**
- Version control (Git)
- Developer workflows
- Backup and restore
- Integration with other tools
- Data analysis

**Features:**
- JSON Resume standard format (industry standard)
- Includes all resume sections
- Optional ResumeAI metadata (tailoring changes, version info)
- Round-trip compatible (export → import)
- Human-readable and machine-parseable

**How to Export:**
1. Navigate to the Editor page
2. Click the "Download" button
3. Select "JSON" from the dropdown menu
4. File downloads automatically as `resume-export-YYYY-MM-DD.json`

**File Structure:**
```json
{
  "basics": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 (555) 123-4567",
    "summary": "Passionate software engineer..."
  },
  "work": [...],
  "education": [...],
  "skills": [...],
  "projects": [...],
  "$resumeai": {
    "version": "1.0.0",
    "exportedAt": "2026-03-12T10:30:00Z",
    "generator": "ResumeAI"
  }
}
```

**Use Cases:**
- Store resume in Git repository for version history
- Share resume data with developers
- Import into other resume tools
- Automated processing and analysis

---

### HTML Export (NEW)

**Perfect for:**
- Personal websites and portfolios
- Web sharing via email or links
- Quick preview in any browser
- Print-friendly output

**Features:**
- Self-contained HTML (no external dependencies)
- Responsive design (mobile, tablet, desktop)
- Print-friendly styles
- Dark mode support (via `prefers-color-scheme`)
- SEO-friendly meta tags
- Accessibility compliant (WCAG 2.1 AA)

**Available Templates:**
- **Modern**: Contemporary design with two-column layout, bold headers, and accent colors
- **Classic**: Traditional professional design with serif fonts, conservative styling
- **Minimal**: Clean, minimalist design with maximum whitespace

**How to Export:**
1. Navigate to the Editor page
2. Click the "Download" button
3. Select "HTML" from the dropdown menu
4. File downloads automatically as `resume-export-YYYY-MM-DD.html`
5. Open in any web browser

**Features by Template:**

| Feature | Modern | Classic | Minimal |
|---------|--------|---------|---------|
| Layout | Two-column | Single-column | Single-column |
| Font | Inter (sans-serif) | Georgia (serif) | Helvetica Neue (sans-serif) |
| Colors | Blue accent | Black/navy | Black/white |
| Best For | Tech, startups | Finance, law | Design, creative |

**Dark Mode:**
HTML export automatically supports dark mode if your system preference is set to dark. The resume will adjust colors for better readability in low-light environments.

**Print Support:**
All HTML templates include print-friendly styles. Simply press Ctrl+P (Windows/Linux) or Cmd+P (Mac) to print or save as PDF.

---

### PDF Export (Existing)

**Perfect for:**
- Job applications
- Email attachments
- Professional submissions

**Features:**
- Multiple variants (Modern, Classic, Minimal, etc.)
- ATS-friendly formatting
- Professional typography
- Consistent rendering across devices

---

### DOCX Export (Existing)

**Perfect for:**
- Further editing in Word
- Collaborative editing
- Track changes workflows

---

### TXT Export (Existing)

**Perfect for:**
- Plain text submissions
- Email body
- Simple copy-paste

---

### Markdown Export (Existing)

**Perfect for:**
- GitHub profiles
- Developer portfolios
- Technical documentation

---

## Comparison Table

| Format | Best For | Editable | Web-Ready | ATS-Friendly | File Size |
|--------|----------|----------|-----------|--------------|-----------|
| PDF | Job applications | ❌ | ❌ | ✅ | Medium |
| DOCX | Editing | ✅ | ❌ | ✅ | Medium |
| TXT | Plain text | ✅ | ❌ | ❌ | Small |
| MD | Developers | ✅ | ✅ | ❌ | Small |
| **JSON** | **Version control** | **✅** | **❌** | **❌** | **Small** |
| **HTML** | **Web portfolios** | **✅** | **✅** | **✅** | **Medium** |

---

## Tips & Best Practices

### JSON Export

1. **Version Control**: Commit JSON exports to Git for complete version history
2. **Backup**: Store JSON files as backup - they contain all your resume data
3. **Migration**: Use JSON to migrate resume data between tools
4. **Analysis**: Parse JSON with scripts to analyze your resume content

### HTML Export

1. **Web Hosting**: Upload HTML file to your personal website
2. **Email**: Attach HTML file to emails - recipients can open in any browser
3. **Print**: Use browser's print function for high-quality PDF
4. **Dark Mode**: Test in both light and dark mode for best appearance

### General

1. **File Naming**: Exports use date-based naming for easy organization
2. **Multiple Formats**: Export in multiple formats for different purposes
3. **Regular Backups**: Export regularly to maintain backups
4. **Preview First**: Always preview before sending to employers

---

## Troubleshooting

### JSON Export Issues

**Problem:** JSON file won't open
- **Solution:** JSON files are text files. Open with:
  - Text editor (Notepad, TextEdit, VS Code)
  - Web browser (drag and drop)
  - JSON viewer (online or desktop app)

**Problem:** JSON import fails in other tools
- **Solution:** Ensure the tool supports JSON Resume schema v1.0.0

### HTML Export Issues

**Problem:** HTML doesn't look right in email
- **Solution:** HTML export is designed for web browsers, not email clients. For email, use PDF or attach the HTML file (don't paste content).

**Problem:** Dark mode colors are wrong
- **Solution:** Dark mode is automatic based on system preference. To force light mode, temporarily change your system theme.

**Problem:** Print output is cut off
- **Solution:** In print settings:
  - Enable "Background graphics"
  - Set margins to "Default" or "None"
  - Use "Fit to page" scaling

### General Issues

**Problem:** Export button is disabled
- **Solution:** Ensure your resume has at least basic information (name, contact info)

**Problem:** Download doesn't start
- **Solution:** Check browser's download settings and pop-up blocker

**Problem:** Export fails with error
- **Solution:** 
  1. Refresh the page and try again
  2. Check that all required fields are filled
  3. Clear browser cache
  4. Try a different browser

---

## API Documentation

For developers, export endpoints are available via the API:

### JSON Export Endpoint

```http
POST /api/v1/export/json
Content-Type: application/json
Authorization: Bearer <token>

{
  "basics": { ... },
  "work": [ ... ],
  ...
}
```

**Query Parameters:**
- `include_metadata` (boolean): Include ResumeAI metadata (default: true)
- `title` (string): Resume title for metadata
- `tags` (array): Tags for categorization

**Response:**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="resume-export-YYYY-MM-DD.json"`

### HTML Export Endpoint

```http
POST /api/v1/export/html
Content-Type: application/json
Authorization: Bearer <token>

{
  "basics": { ... },
  "work": [ ... ],
  ...
}
```

**Query Parameters:**
- `template` (string): Template name (`modern`, `classic`, `minimal`)
- `dark_mode` (boolean): Enable dark mode support (default: true)
- `title` (string): Resume title

**Response:**
- Content-Type: `text/html`
- Content-Disposition: `attachment; filename="resume-export-YYYY-MM-DD.html"`

### Template Preview Endpoint

```http
GET /api/v1/export/preview/{template_name}
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `text/html`
- HTML preview with sample content

---

## Accessibility

HTML exports are designed to be accessible:

- **Semantic HTML**: Proper heading hierarchy (h1 → h2 → h3)
- **ARIA Labels**: All sections have descriptive labels
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Color Contrast**: Meets WCAG 2.1 AA standards
- **Screen Reader**: Compatible with major screen readers

---

## Future Enhancements

Planned improvements for future phases:

- **Custom Templates**: User-submitted template support
- **Template Marketplace**: Share and download community templates
- **Advanced Customization**: Color picker, font selection, layout options
- **LaTeX Export**: Academic and technical resume format
- **Video Resume**: Multimedia resume format (experimental)

---

## Support

For issues or questions:
- Check this guide first
- Review error messages carefully
- Try exporting in a different format
- Contact support with specific error details

---

## Changelog

### Version 1.0.0 (2026-03-12)

**Added:**
- JSON export functionality
- HTML export with 3 templates (Modern, Classic, Minimal)
- Dark mode support for HTML exports
- Template preview endpoint
- Rate limiting on export endpoints (10 req/min)

**Improved:**
- Export dialog UI with format separation
- File naming consistency across formats
- Error messages for export failures

---

**Phase 8 Status:** Plans 01 & 02 Complete ✅ | Plans 03 & 04 In Progress
