# MVP Roadmap: ResumeAI Service Architecture

**Goal:** Convert ResumeAI from a mock prototype to a functional MVP by establishing a dedicated, scalable API service that wraps the powerful `resume-cli`.

**Status:** Draft / Planning
**Owner:** Engineering Team

---

## 1. Architectural Overview

The MVP will transition from a monolithic mock server to a decoupled architecture:

*   **Frontend (Client):** The existing React application. It will store user state locally (for now) and send data to the API for heavy lifting.
*   **Resume API Service (Server):** A new, dedicated FastAPI service.
    *   **Role:** Acts as the engine for ResumeAI and a potential B2B product for other developers.
    *   **Core Core:** Wraps `resume-cli` to leverage its robust templating and AI logic.
    *   **Environment:** Dockerized container including Python and the heavy `texlive` dependency for professional PDF generation.

## 2. Detailed Implementation Plan

### Phase 1: The Resume API Service

The core of the MVP is the backend service. It must be isolated to handle heavy dependencies (LaTeX) and provide a clean API surface.

#### Task 1.1: Project Scaffolding & Dependency Integration
*   **Action:** Create a new directory `resume-api/` (or a separate repo `resume-api-service`).
*   **Dependencies:**
    *   **FastAPI / Uvicorn:** For the web server.
    *   **Resume CLI:** Vendor the `resume-cli` code (copy `cli/`, `templates/`, `config/` from the source repo) into `resume-api/lib/` to ensure stability and ease of modification without waiting for upstream package releases.
    *   **Pydantic:** For strict request/response validation.

#### Task 1.2: Dockerization (Crucial)
*   **Challenge:** `resume-cli` relies on LaTeX (`texlive`) for high-quality PDFs. This is a large dependency (~2-4GB) and hard to install on standard PaaS (like Vercel/Heroku) directly.
*   **Solution:** Create a `Dockerfile` for the API service.
    *   **Base Image:** `python:3.11-slim`
    *   **System Deps:** Install `texlive-full` (or a curated scheme like `texlive-xetex` + `pandoc` if sufficient) and `git`.
    *   **Steps:**
        1.  Install system deps.
        2.  Copy application code.
        3.  Install Python requirements (`pip install -r requirements.txt`).
        4.  Expose Port 8000.

#### Task 1.3: API Endpoints Implementation
Implement the following endpoints wrapping the CLI logic:

*   **`POST /v1/render/pdf`**
    *   **Input:** JSON containing `resume_data` (matching `resume.yaml` schema) and `variant` (string).
    *   **Logic:**
        1.  Dump `resume_data` to a temporary `resume.yaml`.
        2.  Invoke `resume-cli generate --variant {variant} --format pdf`.
        3.  Read the generated PDF bytes.
        4.  Cleanup temp files.
    *   **Output:** `application/pdf` stream.

*   **`POST /v1/tailor`**
    *   **Input:** JSON containing `resume_data` and `job_description` (text).
    *   **Logic:**
        1.  Initialize the AI Generator from `resume-cli`.
        2.  Run the "tailoring" logic (extract keywords, reorder bullets).
        3.  (Decision: Use existing OpenAI/Claude integrations or refactor for Gemini? *Recommendation: Stick to CLI's native Claude/OpenAI support first for speed, then add Gemini adapter.*)
    *   **Output:** JSON with the modified `resume_data`.

*   **`GET /v1/variants`**
    *   **Logic:** Return list of available templates/variants from the CLI config.
    *   **Output:** JSON list (e.g., `["base", "backend", "creative"]`).

#### Task 1.4: Authentication & Monetization Prep
*   **Action:** Add a lightweight API Key middleware.
*   **Logic:** Check `X-API-KEY` header against environment variables or a simple database.
*   **Goal:** Allow ResumeAI (the frontend) to have a "Master Key", while enabling future issuance of keys to 3rd party developers.

---

### Phase 2: Frontend Integration

Connect the React frontend to the new real API.

#### Task 2.1: Client-Side Persistence
*   **Action:** Since we aren't building a user DB yet, use `localStorage` or `IndexedDB` to save the user's "Master Profile" (Resume Data).
*   **Benefit:** Users won't lose data on refresh, but we avoid auth/DB complexity for MVP.

#### Task 2.2: API Integration
*   **Action:** Update `hooks/useGeneratePackage.ts` and `pages/Workspace.tsx`.
*   **Change:**
    *   Point API calls to the new Resume API URL (e.g., `http://localhost:8000` or the deployed URL).
    *   Send the full resume JSON object instead of relying on server-side stored state.
    *   Handle the binary PDF response properly for the "Download" button.

---

## 3. Deployment Strategy

*   **API Service:** Deploy as a Docker container.
    *   *Options:* Google Cloud Run, AWS App Runner, or Railway. (Cloud Run is recommended for scaling to zero when not in use).
*   **Frontend:** Standard Static Site Hosting (Vercel, Netlify).

## 4. Definition of Done (MVP)

1.  [ ] **Repo Created:** `resume-api` repo exists with `resume-cli` vendored.
2.  [ ] **Docker Builds:** `docker build` passes and includes `texlive`.
3.  [ ] **PDF Generation Works:** Sending JSON to `/render/pdf` returns a valid, professional PDF.
4.  [ ] **Tailoring Works:** Sending JSON + Job Desc returns modified JSON.
5.  [ ] **Frontend Connected:** The "Generate" and "Download PDF" buttons in the React app successfully trigger the API and display/download results.
