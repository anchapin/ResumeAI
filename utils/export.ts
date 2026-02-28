/**
 * Utility functions for exporting resumes in different formats
 */

import { ResumeData, FormatOptions } from '../types';

/**
 * Default formatting options
 */
export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  fontFamily: 'Arial',
  fontSize: 11,
  lineSpacing: 1.15,
  marginTop: 0.5,
  marginBottom: 0.5,
  marginLeft: 0.75,
  marginRight: 0.75,
  colorTheme: 'default',
  layout: 'single',
  showSectionDividers: true,
  sectionOrder: null,
};

/**
 * Export resume to PDF
 * @param resumeData - Resume data to export
 * @param options - Formatting options
 */
export async function exportToPDF(
  resumeData: ResumeData,
  options: FormatOptions = DEFAULT_FORMAT_OPTIONS,
): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const apiKey = localStorage.getItem('RESUMEAI_API_KEY');

  try {
    const response = await fetch(`${API_URL}/v1/render/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-KEY': apiKey }),
      },
      body: JSON.stringify({
        resume_data: resumeData,
        variant: 'base',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    // Get blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
}

/**
 * Export resume to HTML
 * @param resumeData - Resume data to export
 * @param options - Formatting options
 */
export async function exportToHTML(
  resumeData: ResumeData,
  options: FormatOptions = DEFAULT_FORMAT_OPTIONS,
): Promise<void> {
  const html = generateHTML(resumeData, options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resume-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Export resume to Word (DOCX) - simplified version
 * @param resumeData - Resume data to export
 * @param options - Formatting options
 */
export async function exportToWord(
  resumeData: ResumeData,
  options: FormatOptions = DEFAULT_FORMAT_OPTIONS,
): Promise<void> {
  // For a full DOCX export, you would use a library like docx
  // This is a simplified version using HTML with Word-compatible format
  const html = generateWordHTML(resumeData, options);
  const blob = new Blob([html], {
    type: 'application/vnd.ms-word',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resume-${Date.now()}.doc`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Generate HTML from resume data
 * @param resumeData - Resume data
 * @param options - Formatting options
 * @returns HTML string
 */
function generateHTML(resumeData: ResumeData, options: FormatOptions): string {
  const { basics } = resumeData;
  const styles = getHTMLStyles(options);

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${basics?.name || 'Resume'}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="resume">`;

  // Header
  if (basics) {
    html += `
    <header class="header">
      <h1>${basics.name || ''}</h1>
      ${basics.label ? `<p class="title">${basics.label}</p>` : ''}
      <div class="contact-info">
        ${basics.email ? `<span>${basics.email}</span>` : ''}
        ${basics.phone ? `<span>${basics.phone}</span>` : ''}
        ${basics.url ? `<span>${basics.url}</span>` : ''}
      </div>
      ${basics.summary ? `<p class="summary">${basics.summary}</p>` : ''}
    </header>`;
  }

  // Experience
  if (resumeData.work && resumeData.work.length > 0) {
    html += `
    <section class="section">
      <h2>Experience</h2>`;
    resumeData.work.forEach((work) => {
      html += `
      <div class="item">
        <div class="item-header">
          <h3>${work.company || ''}</h3>
          <span class="date">${work.startDate || ''} - ${work.endDate || 'Present'}</span>
        </div>
        ${work.position ? `<p class="subtitle">${work.position}</p>` : ''}
        ${work.summary ? `<p class="summary">${work.summary}</p>` : ''}
        ${
          work.highlights && work.highlights.length > 0
            ? `
        <ul>
          ${work.highlights.map((h) => `<li>${h}</li>`).join('')}
        </ul>`
            : ''
        }
      </div>`;
    });
    html += `</section>`;
  }

  // Education
  if (resumeData.education && resumeData.education.length > 0) {
    html += `
    <section class="section">
      <h2>Education</h2>`;
    resumeData.education.forEach((edu) => {
      html += `
      <div class="item">
        <div class="item-header">
          <h3>${edu.institution || ''}</h3>
          <span class="date">${edu.startDate || ''} - ${edu.endDate || ''}</span>
        </div>
        ${edu.area ? `<p class="subtitle">${edu.studyType} in ${edu.area}</p>` : ''}
      </div>`;
    });
    html += `</section>`;
  }

  // Skills
  if (resumeData.skills && resumeData.skills.length > 0) {
    html += `
    <section class="section">
      <h2>Skills</h2>
      <div class="skills">`;
    resumeData.skills.forEach((skill) => {
      html += `<span class="skill-tag">${skill.name || ''}</span>`;
    });
    html += `
      </div>
    </section>`;
  }

  html += `
  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate Word-compatible HTML from resume data
 * @param resumeData - Resume data
 * @param options - Formatting options
 * @returns Word-compatible HTML string
 */
function generateWordHTML(resumeData: ResumeData, options: FormatOptions): string {
  const html = generateHTML(resumeData, options);
  // Add Word-specific XML namespaces
  return html.replace(
    '<html>',
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">`,
  );
}

/**
 * Get CSS styles for HTML export
 * @param options - Formatting options
 * @returns CSS string
 */
function getHTMLStyles(options: FormatOptions): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${options.fontFamily}, Arial, sans-serif;
      font-size: ${options.fontSize}pt;
      line-height: ${options.lineSpacing};
      color: #333;
      background: white;
    }

    .resume {
      max-width: 8.5in;
      margin: 0 auto;
      padding: ${options.marginTop}in ${options.marginRight}in ${options.marginBottom}in ${options.marginLeft}in;
    }

    .header {
      margin-bottom: 1em;
      border-bottom: 2px solid #333;
      padding-bottom: 0.5em;
    }

    h1 {
      font-size: 24pt;
      margin-bottom: 0.25em;
    }

    .title {
      font-size: 14pt;
      color: #666;
      margin-bottom: 0.5em;
    }

    .contact-info {
      display: flex;
      gap: 1em;
      font-size: 10pt;
      color: #666;
    }

    .summary {
      margin-top: 1em;
      line-height: 1.5;
    }

    .section {
      margin: 1.5em 0;
    }

    ${options.showSectionDividers ? '.section { border-top: 1px solid #ccc; padding-top: 0.5em; }' : ''}

    h2 {
      font-size: 14pt;
      text-transform: uppercase;
      margin-bottom: 0.5em;
      color: #333;
    }

    .item {
      margin: 1em 0;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .item-header h3 {
      font-size: 12pt;
      font-weight: bold;
    }

    .date {
      font-size: 10pt;
      color: #666;
    }

    .subtitle {
      font-size: 11pt;
      color: #666;
      font-style: italic;
    }

    ul {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    li {
      margin: 0.25em 0;
    }

    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5em;
    }

    .skill-tag {
      background: #f0f0f0;
      padding: 0.25em 0.5em;
      border-radius: 4px;
      font-size: 10pt;
    }
  `;
}
