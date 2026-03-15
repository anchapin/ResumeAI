"""
HTML Exporter for Resume API.

Exports resume data to self-contained HTML with embedded CSS.
"""

import html
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from api.models import ResumeData


class HtmlExportResult:
    """Result of HTML export operation."""

    def __init__(
        self,
        html_content: str,
        resume_data: ResumeData,
        template: str = "modern",
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.html_content = html_content
        self.resume_data = resume_data
        self.template = template
        self.metadata = metadata or {}


class HtmlExporter:
    """
    Export resume data to HTML format.

    Features:
    - Self-contained HTML with embedded CSS
    - Responsive design for all screen sizes
    - Print-friendly styles
    - Dark mode support via prefers-color-scheme
    - SEO-friendly meta tags
    - Accessibility compliant (WCAG 2.1 AA)
    """

    AVAILABLE_TEMPLATES = ["modern", "classic", "minimal"]

    def __init__(self):
        """Initialize HTML exporter."""
        pass

    def export(
        self,
        resume_data: ResumeData,
        template: str = "modern",
        dark_mode: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> HtmlExportResult:
        """
        Export resume data to HTML.

        Args:
            resume_data: Resume data to export
            template: Template name (modern, classic, minimal)
            dark_mode: Enable dark mode support
            metadata: Optional metadata

        Returns:
            HtmlExportResult with HTML content
        """
        if template not in self.AVAILABLE_TEMPLATES:
            raise ValueError(
                f"Invalid template '{template}'. Available: {', '.join(self.AVAILABLE_TEMPLATES)}"
            )

        # Generate HTML based on template
        if template == "modern":
            html_content = self._generate_modern_html(
                resume_data, dark_mode, metadata
            )
        elif template == "classic":
            html_content = self._generate_classic_html(
                resume_data, dark_mode, metadata
            )
        else:  # minimal
            html_content = self._generate_minimal_html(
                resume_data, dark_mode, metadata
            )

        return HtmlExportResult(
            html_content=html_content,
            resume_data=resume_data,
            template=template,
            metadata=metadata or {},
        )

    def get_template_preview(self, template_name: str) -> str:
        """
        Get HTML preview of a template with sample content.

        Args:
            template_name: Name of the template to preview

        Returns:
            HTML preview content
        """
        # Create sample resume data for preview
        sample_data = self._create_sample_resume()
        return self.export(sample_data, template=template_name).html_content

    def _create_sample_resume(self) -> ResumeData:
        """Create sample resume data for template preview."""
        from api.models import BasicInfo, WorkItem, EducationItem, Skill, ProjectItem

        return ResumeData(
            basics=BasicInfo(
                name="Jane Doe",
                label="Software Engineer",
                email="jane.doe@example.com",
                phone="+1 (555) 123-4567",
                url="https://janedoe.dev",
                summary="Passionate software engineer with 5+ years of experience building scalable web applications.",
            ),
            work=[
                WorkItem(
                    company="Tech Corp",
                    position="Senior Software Engineer",
                    startDate="2022-01",
                    endDate="",
                    summary="Leading development of microservices architecture.",
                    highlights=[
                        "Reduced API response time by 40%",
                        "Mentored team of 4 junior developers",
                        "Implemented CI/CD pipeline",
                    ],
                )
            ],
            education=[
                EducationItem(
                    institution="University of Technology",
                    area="Computer Science",
                    studyType="Bachelor of Science",
                    startDate="2014-09",
                    endDate="2018-05",
                )
            ],
            skills=[
                Skill(name="Programming Languages", keywords=["Python", "JavaScript", "TypeScript"]),
                Skill(name="Frameworks", keywords=["React", "FastAPI", "Node.js"]),
            ],
            projects=[
                ProjectItem(
                    name="Open Source Project",
                    description="A popular open-source library with 5k+ stars",
                    url="https://github.com/janedoe/project",
                    highlights=["5000+ stars", "100+ contributors"],
                )
            ],
        )

    def _generate_modern_html(
        self,
        resume_data: ResumeData,
        dark_mode: bool,
        metadata: Optional[Dict[str, Any]],
    ) -> str:
        """Generate modern-style HTML resume."""
        css = self._get_modern_css(dark_mode)
        return self._generate_html(resume_data, css, metadata)

    def _generate_classic_html(
        self,
        resume_data: ResumeData,
        dark_mode: bool,
        metadata: Optional[Dict[str, Any]],
    ) -> str:
        """Generate classic-style HTML resume."""
        css = self._get_classic_css(dark_mode)
        return self._generate_html(resume_data, css, metadata)

    def _generate_minimal_html(
        self,
        resume_data: ResumeData,
        dark_mode: bool,
        metadata: Optional[Dict[str, Any]],
    ) -> str:
        """Generate minimal-style HTML resume."""
        css = self._get_minimal_css(dark_mode)
        return self._generate_html(resume_data, css, metadata)

    def _generate_html(
        self,
        resume_data: ResumeData,
        css: str,
        metadata: Optional[Dict[str, Any]],
    ) -> str:
        """Generate HTML document with resume content."""
        title = metadata.get("title", "Resume") if metadata else "Resume"
        name = resume_data.basics.name if resume_data.basics else "Resume"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Resume of {self._escape(name)}">
    <meta name="generator" content="ResumeAI">
    <title>{self._escape(title)} - {self._escape(name)}</title>
    <style>
{css}
    </style>
</head>
<body>
    <main class="resume" aria-label="Resume">
        {self._render_header(resume_data)}
        {self._render_summary(resume_data)}
        {self._render_experience(resume_data)}
        {self._render_education(resume_data)}
        {self._render_skills(resume_data)}
        {self._render_projects(resume_data)}
    </main>
</body>
</html>"""

    def _render_header(self, resume_data: ResumeData) -> str:
        """Render header section with contact info."""
        basics = resume_data.basics
        if not basics:
            return ""

        html_parts = ['<header class="header">']

        if basics.name:
            html_parts.append(f'<h1 class="name">{self._escape(basics.name)}</h1>')

        if basics.label:
            html_parts.append(f'<p class="label">{self._escape(basics.label)}</p>')

        # Contact info
        contact_items = []
        if basics.email:
            contact_items.append(
                f'<a href="mailto:{self._escape(basics.email)}" class="contact-item email">{self._escape(basics.email)}</a>'
            )
        if basics.phone:
            contact_items.append(
                f'<a href="tel:{self._escape(basics.phone)}" class="contact-item phone">{self._escape(basics.phone)}</a>'
            )
        if basics.url:
            contact_items.append(
                f'<a href="{self._escape(basics.url)}" class="contact-item website" target="_blank" rel="noopener noreferrer">{self._escape(basics.url)}</a>'
            )

        if contact_items:
            html_parts.append(f'<div class="contact">{"".join(contact_items)}</div>')

        html_parts.append("</header>")
        return "".join(html_parts)

    def _render_summary(self, resume_data: ResumeData) -> str:
        """Render professional summary section."""
        basics = resume_data.basics
        if not basics or not basics.summary:
            return ""

        return f"""<section class="section summary" aria-labelledby="summary-heading">
    <h2 id="summary-heading" class="section-title">Summary</h2>
    <div class="section-content">
        <p>{self._escape(basics.summary)}</p>
    </div>
</section>"""

    def _render_experience(self, resume_data: ResumeData) -> str:
        """Render work experience section."""
        if not resume_data.work:
            return ""

        html_parts = [
            '<section class="section experience" aria-labelledby="experience-heading">',
            '<h2 id="experience-heading" class="section-title">Experience</h2>',
            '<div class="section-content">',
        ]

        for work in resume_data.work:
            html_parts.append('<div class="work-item">')

            if hasattr(work, "company") and work.company:
                html_parts.append(f'<h3 class="company">{self._escape(work.company)}</h3>')

            if hasattr(work, "position") and work.position:
                html_parts.append(f'<p class="position">{self._escape(work.position)}</p>')

            # Date range
            date_range = ""
            if hasattr(work, "startDate") and work.startDate:
                start = work.startDate
                end = getattr(work, "endDate", "") or "Present"
                date_range = f'<span class="date-range">{self._escape(start)} – {self._escape(end)}</span>'

            if date_range:
                html_parts.append(f'<div class="date-range-wrapper">{date_range}</div>')

            if hasattr(work, "summary") and work.summary:
                html_parts.append(f'<p class="summary">{self._escape(work.summary)}</p>')

            if hasattr(work, "highlights") and work.highlights:
                html_parts.append('<ul class="highlights">')
                for highlight in work.highlights:
                    html_parts.append(f'<li>{self._escape(highlight)}</li>')
                html_parts.append("</ul>")

            html_parts.append("</div>")  # .work-item

        html_parts.extend(["</div>", "</section>"])
        return "".join(html_parts)

    def _render_education(self, resume_data: ResumeData) -> str:
        """Render education section."""
        if not resume_data.education:
            return ""

        html_parts = [
            '<section class="section education" aria-labelledby="education-heading">',
            '<h2 id="education-heading" class="section-title">Education</h2>',
            '<div class="section-content">',
        ]

        for edu in resume_data.education:
            html_parts.append('<div class="education-item">')

            if hasattr(edu, "institution") and edu.institution:
                html_parts.append(f'<h3 class="institution">{self._escape(edu.institution)}</h3>')

            degree_parts = []
            if hasattr(edu, "area") and edu.area:
                degree_parts.append(self._escape(edu.area))
            if hasattr(edu, "studyType") and edu.studyType:
                degree_parts.append(self._escape(edu.studyType))

            if degree_parts:
                html_parts.append(f'<p class="degree">{", ".join(degree_parts)}</p>')

            # Date range
            if hasattr(edu, "startDate") and edu.startDate:
                start = edu.startDate
                end = getattr(edu, "endDate", "") or "Present"
                html_parts.append(
                    f'<span class="date-range">{self._escape(start)} – {self._escape(end)}</span>'
                )

            html_parts.append("</div>")  # .education-item

        html_parts.extend(["</div>", "</section>"])
        return "".join(html_parts)

    def _render_skills(self, resume_data: ResumeData) -> str:
        """Render skills section."""
        if not resume_data.skills:
            return ""

        html_parts = [
            '<section class="section skills" aria-labelledby="skills-heading">',
            '<h2 id="skills-heading" class="section-title">Skills</h2>',
            '<div class="section-content">',
        ]

        for skill in resume_data.skills:
            html_parts.append('<div class="skill-item">')

            if hasattr(skill, "name") and skill.name:
                html_parts.append(f'<h3 class="skill-name">{self._escape(skill.name)}</h3>')

            if hasattr(skill, "keywords") and skill.keywords:
                html_parts.append('<div class="skill-keywords">')
                for keyword in skill.keywords:
                    html_parts.append(f'<span class="keyword">{self._escape(keyword)}</span>')
                html_parts.append("</div>")

            html_parts.append("</div>")  # .skill-item

        html_parts.extend(["</div>", "</section>"])
        return "".join(html_parts)

    def _render_projects(self, resume_data: ResumeData) -> str:
        """Render projects section."""
        if not resume_data.projects:
            return ""

        html_parts = [
            '<section class="section projects" aria-labelledby="projects-heading">',
            '<h2 id="projects-heading" class="section-title">Projects</h2>',
            '<div class="section-content">',
        ]

        for project in resume_data.projects:
            html_parts.append('<div class="project-item">')

            if hasattr(project, "name") and project.name:
                html_parts.append(f'<h3 class="project-name">{self._escape(project.name)}</h3>')

            if hasattr(project, "description") and project.description:
                html_parts.append(f'<p class="project-description">{self._escape(project.description)}</p>')

            if hasattr(project, "url") and project.url:
                html_parts.append(
                    f'<a href="{self._escape(project.url)}" class="project-link" target="_blank" rel="noopener noreferrer">View Project</a>'
                )

            if hasattr(project, "highlights") and project.highlights:
                html_parts.append('<ul class="highlights">')
                for highlight in project.highlights:
                    html_parts.append(f'<li>{self._escape(highlight)}</li>')
                html_parts.append("</ul>")

            html_parts.append("</div>")  # .project-item

        html_parts.extend(["</div>", "</section>"])
        return "".join(html_parts)

    def _get_modern_css(self, dark_mode: bool) -> str:
        """Get modern template CSS."""
        return f"""
/* Modern Template Styles */
:root {{
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --text-color: #1e293b;
    --bg-color: #ffffff;
    --border-color: #e2e8f0;
    --accent-color: #3b82f6;
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}}

{self._get_dark_mode_css() if dark_mode else ""}

* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}}

body {{
    font-family: var(--font-family);
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-color);
    background-color: var(--bg-color);
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
}}

.resume {{
    background: var(--bg-color);
}}

.header {{
    border-bottom: 3px solid var(--primary-color);
    padding-bottom: 1.5rem;
    margin-bottom: 2rem;
}}

.name {{
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}}

.label {{
    font-size: 1.25rem;
    color: var(--secondary-color);
    font-weight: 500;
}}

.contact {{
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
}}

.contact-item {{
    color: var(--secondary-color);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
}}

.contact-item:hover {{
    color: var(--primary-color);
}}

.section {{
    margin-bottom: 2rem;
}}

.section-title {{
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--primary-color);
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}}

.section-content {{
    padding-top: 0.5rem;
}}

.work-item, .education-item, .project-item {{
    margin-bottom: 1.5rem;
}}

.company, .institution, .project-name {{
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.25rem;
}}

.position, .degree {{
    color: var(--secondary-color);
    font-weight: 500;
    margin-bottom: 0.5rem;
}}

.date-range-wrapper {{
    margin-bottom: 0.75rem;
}}

.date-range {{
    color: var(--secondary-color);
    font-size: 0.875rem;
    font-style: italic;
}}

.summary {{
    color: var(--text-color);
    line-height: 1.7;
}}

.highlights {{
    list-style: none;
    padding-left: 0;
}}

.highlights li {{
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-color);
}}

.highlights li::before {{
    content: "•";
    position: absolute;
    left: 0;
    color: var(--primary-color);
    font-weight: bold;
}}

.skill-item {{
    margin-bottom: 1rem;
}}

.skill-name {{
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.5rem;
}}

.skill-keywords {{
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}}

.keyword {{
    background: var(--border-color);
    color: var(--text-color);
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
}}

.project-link {{
    display: inline-block;
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
    margin-top: 0.5rem;
}}

.project-link:hover {{
    text-decoration: underline;
}}

/* Print Styles */
@media print {{
    body {{
        max-width: none;
        padding: 0;
        margin: 0;
    }}

    .resume {{
        padding: 1rem;
    }}

    a {{
        text-decoration: none;
        color: var(--text-color);
    }}

    a[href]::after {{
        content: " (" attr(href) ")";
        font-size: 0.75rem;
        color: var(--secondary-color);
    }}

    .no-print {{
        display: none;
    }}
}}

/* Responsive Design */
@media (max-width: 600px) {{
    body {{
        padding: 1rem;
    }}

    .name {{
        font-size: 2rem;
    }}

    .contact {{
        flex-direction: column;
        gap: 0.5rem;
    }}
}}
"""

    def _get_classic_css(self, dark_mode: bool) -> str:
        """Get classic template CSS."""
        return f"""
/* Classic Template Styles */
:root {{
    --primary-color: #1a1a1a;
    --secondary-color: #4a4a4a;
    --text-color: #1a1a1a;
    --bg-color: #ffffff;
    --border-color: #d4d4d4;
    --font-family: 'Georgia', 'Times New Roman', serif;
}}

{self._get_dark_mode_css() if dark_mode else ""}

* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}}

body {{
    font-family: var(--font-family);
    font-size: 12pt;
    line-height: 1.5;
    color: var(--text-color);
    background-color: var(--bg-color);
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}}

.header {{
    text-align: center;
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
}}

.name {{
    font-size: 24pt;
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 0.25rem;
}}

.label {{
    font-size: 14pt;
    color: var(--secondary-color);
    font-style: italic;
}}

.contact {{
    margin-top: 0.75rem;
    font-size: 10pt;
}}

.contact-item {{
    color: var(--secondary-color);
    text-decoration: none;
    margin: 0 0.5rem;
}}

.contact-item:first-child {{
    margin-left: 0;
}}

.section {{
    margin-bottom: 1.5rem;
}}

.section-title {{
    font-size: 14pt;
    font-weight: bold;
    color: var(--primary-color);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.25rem;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
}}

.work-item, .education-item {{
    margin-bottom: 1rem;
}}

.company, .institution {{
    font-size: 12pt;
    font-weight: bold;
}}

.position, .degree {{
    font-style: italic;
    color: var(--secondary-color);
}}

.date-range {{
    float: right;
    font-size: 10pt;
    color: var(--secondary-color);
}}

.highlights {{
    margin-top: 0.5rem;
}}

.highlights li {{
    margin-bottom: 0.25rem;
    padding-left: 1rem;
}}

/* Print Styles */
@media print {{
    body {{
        padding: 0;
        margin: 0;
    }}

    a {{
        text-decoration: none;
        color: var(--text-color);
    }}
}}
"""

    def _get_minimal_css(self, dark_mode: bool) -> str:
        """Get minimal template CSS."""
        return f"""
/* Minimal Template Styles */
:root {{
    --text-color: #111111;
    --bg-color: #ffffff;
    --font-family: 'Helvetica Neue', 'Arial', sans-serif;
}}

{self._get_dark_mode_css() if dark_mode else ""}

* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}}

body {{
    font-family: var(--font-family);
    font-size: 11pt;
    line-height: 1.4;
    color: var(--text-color);
    background-color: var(--bg-color);
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
}}

.header {{
    margin-bottom: 2rem;
}}

.name {{
    font-size: 2rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    margin-bottom: 0.5rem;
}}

.label {{
    font-size: 1rem;
    color: #666;
}}

.contact {{
    margin-top: 0.5rem;
}}

.contact-item {{
    color: #666;
    text-decoration: none;
    margin-right: 1rem;
    font-size: 0.875rem;
}}

.section {{
    margin-bottom: 1.5rem;
}}

.section-title {{
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
    color: #666;
}}

.work-item, .education-item, .project-item {{
    margin-bottom: 1.25rem;
}}

.company, .institution, .project-name {{
    font-weight: 600;
}}

.position, .degree {{
    color: #666;
}}

.date-range {{
    color: #999;
    font-size: 0.875rem;
}}

.highlights {{
    list-style: none;
    margin-top: 0.5rem;
}}

.highlights li {{
    margin-bottom: 0.25rem;
    padding-left: 1rem;
    position: relative;
}}

.highlights li::before {{
    content: "—";
    position: absolute;
    left: 0;
    color: #999;
}}

.skill-keywords {{
    display: inline;
}}

.keyword {{
    margin-right: 0.5rem;
}}

/* Print Styles */
@media print {{
    body {{
        padding: 0;
    }}

    a {{
        color: var(--text-color);
    }}
}}
"""

    def _get_dark_mode_css(self) -> str:
        """Get dark mode media query CSS."""
        return """
@media (prefers-color-scheme: dark) {
    :root {
        --text-color: #f1f5f9;
        --bg-color: #0f172a;
        --border-color: #334155;
        --primary-color: #60a5fa;
        --secondary-color: #94a3b8;
        --accent-color: #3b82f6;
    }

    .keyword {
        background: #1e293b;
        color: #f1f5f9;
    }
}
"""

    def _escape(self, text: str) -> str:
        """Escape HTML special characters."""
        return html.escape(str(text)) if text else ""
