# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ResumeAI SaaS is a resume builder dashboard and editor for tailoring job applications. The project consists of:
- **Frontend:** React 19 application with TypeScript and Vite
- **Backend:** FastAPI Python server (currently mocked, transitioning to production API)

## Development Commands

### Frontend
```bash
npm install              # Install dependencies
npm run dev              # Start dev server on port 3000
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run Vitest tests
```

### Backend
```bash
python server.py         # Start FastAPI server on port 8000
# The backend listens on 0.0.0.0:8000 (or PORT env var)
```

### Environment Setup
Create `.env.local` and set:
```
GEMINI_API_KEY=your_api_key_here
```

## Architecture

### Frontend Structure
The React app uses a simple SPA routing pattern managed through state in `App.tsx`:

- **Entry Point:** `index.tsx` → `App.tsx`
- **Routing:** Client-side using React state (`Route` enum in `types.ts`)
- **Pages:** `Dashboard.tsx`, `Editor.tsx`, `Workspace.tsx`, `Settings.tsx`
- **Components:** `Sidebar.tsx` for navigation
- **Hooks:** Custom hooks in `hooks/` (e.g., `useGeneratePackage.ts`)
- **Types:** Shared interfaces in `types.ts`

### Backend Structure
- `server.py` - FastAPI application with three main endpoints:
  - `POST /generate/preview` - Basic resume preview (markdown)
  - `POST /generate/pdf` - PDF generation (currently mocked)
  - `POST /generate/package` - Full package with tailored resume + cover letter

The backend is currently using mock generators (`MockTemplateGenerator`, `MockAIGenerator`, `MockCoverLetterGenerator`). See `MVP_ROADMAP.md` for the transition plan to integrate real `resume-cli`.

### API Integration
- Frontend communicates with backend via `http://127.0.0.1:8000` (see `hooks/useGeneratePackage.ts:29`)
- Note: `127.0.0.1` is used instead of `localhost` to avoid IPv6 resolution issues
- CORS is enabled for local development

### State Management
- React `useState` for UI state and navigation
- `localStorage` used for user profile persistence (MVP approach)

## Code Patterns & Conventions

### TypeScript
- Strong typing throughout with interfaces defined in `types.ts`
- Backend uses Pydantic models for request/response validation

### Performance
- React.memo used for expensive components
- `useCallback` for event handlers
- Active optimization work on array allocations (see recent commits)
- Benchmark tests available in `pages/Editor.bench.test.tsx`

### Styling
- Tailwind CSS with custom design system
- Primary color: indigo (#4f46e5)
- Font: Inter family

## Key Files
- `App.tsx` - Main app component with routing logic
- `pages/Workspace.tsx` - Main application workspace for generating resumes
- `pages/Editor.tsx` - Resume data editor (has performance benchmarks)
- `hooks/useGeneratePackage.ts` - API integration for package generation
- `types.ts` - Shared TypeScript interfaces
- `server.py` - Backend API endpoints
- `MVP_ROADMAP.md` - Detailed transition plan to production architecture

## Current Status
The project is in a transition phase from mock prototype to functional MVP. The backend endpoints are mocked but structured to facilitate integration with the real `resume-cli` library. See `MVP_ROADMAP.md` for the detailed implementation plan including Dockerization, `resume-cli` integration, and deployment strategy.
