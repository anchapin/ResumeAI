# Project: ResumeAI

**Status:** Active Development  
**Last Updated:** 2026-03-15

---

## What It Is

ResumeAI is a resume builder SaaS application with a React 19 frontend (TypeScript/Vite) and FastAPI backend. It enables users to create, customize, and export professional resumes with AI-powered assistance.

---

## Who It's For

- **Primary Users:** Job seekers who want to create professional resumes quickly
- **Secondary Users:** Career coaches, recruiters, and HR professionals
- **Target Audience:** Professionals at all career stages looking to improve their job application materials

---

## Problem It Solves

Creating a professional resume is time-consuming and challenging. Job seekers often struggle with:
- **Formatting:** Creating visually appealing, ATS-compatible resumes
- **Content:** Knowing what to include and how to phrase achievements
- **Tailoring:** Customizing resumes for each job application
- **Analysis:** Understanding how well their resume matches job requirements

ResumeAI solves these problems by providing AI-powered tools that:
- Generate tailored resumes based on job descriptions
- Provide match scoring against job postings
- Offer multiple export formats (PDF, DOCX, HTML, etc.)
- Suggest improvements based on best practices

---

## Success Definition

### Core Success Metrics
- Users can create a professional resume in under 10 minutes
- Resume export works seamlessly across all supported formats
- AI tailoring produces relevant, personalized content
- Job match scoring provides actionable feedback

### Technical Success
- Frontend builds without errors
- Backend API responds within acceptable latency
- All tests pass
- No critical security vulnerabilities

### Product Success
- v1.1 (Job Application Workflow) shipped and complete
- Phases 02-15 in various stages of development
- Active user base with positive feedback

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Backend | FastAPI, Python 3.x |
| Database | SQLite (local), extensible |
| AI | OpenAI GPT models, sentence-transformers |
| Export | PDFKit, python-docx |

---

## Current Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 02 | Job Description Input | In Progress |
| 03 | AI Resume Tailoring | In Progress |
| 04 | Cover Letter Generation | In Progress |
| 05 | Enhanced Export Formats | In Progress |
| 06 | GitHub Projects Integration | In Progress |
| 07 | Manual Tailoring Editor | In Progress |
| 08 | Export Enhancements | In Progress |
| 09 | Job Match Scoring | Complete ✅ |
| 13 | Team Workspaces | In Progress |
| 14 | AI Enhancements | In Progress |
| 15 | Job Board Integration | In Progress |

---

## Key Features (v1.1 Delivered)

1. **Error Recovery UI** - Actionable error messages with retry and backup download
2. **Job Description Input** - Text paste and URL fetch with parsing
3. **AI Resume Tailoring** - GPT-powered resume customization with accept/reject
4. **Cover Letter Generation** - AI-generated cover letters with tone options
5. **Multi-Format Export** - PDF, DOCX, TXT, MD, JSON, HTML export
6. **GitHub Integration** - Import GitHub projects to resume
7. **Manual Editor** - Rich text editor with version history
8. **Export Templates** - Multiple PDF templates (Modern, Classic, Minimal)
9. **Job Match Scoring** - Semantic and keyword matching with gap analysis

---

## Out of Scope (v1)

- Mobile app
- Cloud storage / account sync
- Job application tracking (ATS integration)
- Resume hosting / public URLs
- Payment processing / subscriptions

---

## Project Values

1. **User-First:** Every feature prioritizes the user's needs
2. **Quality Over Speed:** Reliable, well-tested code
3. **AI as Assistant:** AI enhances human creativity, not replaces it
4. **Privacy First:** User data stays local by default
5. **Open Feedback:** Community input shapes the roadmap

---

## Links

- **Repository:** `/home/alex/Projects/ResumeAI`
- **Planning:** `.planning/`
- **Phases:** `.planning/phases/`
- **Milestones:** `.planning/milestones/`

---

_Project context document - Initialize with GSD workflow_
