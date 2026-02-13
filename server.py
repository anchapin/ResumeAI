import os
import json
import asyncio
import tempfile
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Any
from async_lru import alru_cache
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import yaml

# NOTE: In a real environment, these would be imported from the CLI package
# from cli.generators.template import TemplateGenerator
# from cli.generators.ai_generator import AIGenerator
# from cli.generators.cover_letter import CoverLetterGenerator
# from cli.utils import ResumeYAML


# Mocking the CLI classes for the purpose of this server implementation
class MockTemplateGenerator:
    def generate(self, data: Dict, variant: str) -> str:
        # Mock markdown generation
        experience_section = self._format_experience(data.get("experience", []))

        return f"""# {data.get('name')}
## {data.get('role')}

**Location:** {data.get('location')} | **Email:** {data.get('email')}

### Professional Experience
{experience_section}

*(Generated with variant: {variant})*
"""

    def _format_experience(self, experience: List[Dict]) -> str:
        return "".join(
            f"\n**{exp.get('role', 'Role')}** at {exp.get('company', 'Company')}\n"
            f"{exp.get('startDate', '')} - {exp.get('endDate', '')}\n"
            f"{exp.get('description', '')}\n"
            for exp in experience
        )

    def generate_pdf(self, data: Dict, variant: str) -> bytes:
        # Return a dummy PDF byte stream
        return b"%PDF-1.4... (Mock PDF Data)"


class MockAIGenerator:
    @alru_cache(maxsize=32)
    async def tailor_resume(self, resume_json: str, job_description: str) -> str:
        # Simulate AI tailoring logic
        # Simulate expensive operation (uncomment to verify caching behavior)
        # await asyncio.sleep(2)

        data = json.loads(resume_json)
        experience_section = MockTemplateGenerator()._format_experience(
            data.get("experience", [])
        )

        return f"""# {data.get('name')} (Tailored)
## {data.get('role')}

**Summary:**
Highly motivated professional tailored for the following job requirements:
{job_description[:100]}...

### Tailored Experience
{experience_section}
"""

    def analyze_match(self, resume_data: Dict, job_description: str) -> str:
        return "Match Score: 88/100. Strong alignment with required skills in React and Python."


class MockCoverLetterGenerator:
    def generate(self, data: Dict, company_name: str, job_description: str) -> str:
        experiences = data.get("experience", [])
        latest_company = (
            experiences[0].get("company") if experiences else "my previous roles"
        )

        return f"""Dear Hiring Manager at {company_name},

I am writing to express my strong interest in the open position. With my background as a {data.get('role')}, I am confident I can contribute significantly to your team.

Reflecting on your needs: "{job_description[:50]}...", I believe my experience at {latest_company} makes me a perfect fit.

Sincerely,
{data.get('name')}
"""


# Initialize Generators
template_generator = MockTemplateGenerator()
ai_generator = MockAIGenerator()
cover_letter_generator = MockCoverLetterGenerator()

app = FastAPI(title="ResumeAI API")

# Allow CORS for local development
# Note: allow_credentials=True is invalid with allow_origins=["*"] in strict CORS specs.
# Since we don't rely on cookies/auth for this local tool, we set credentials to False.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---


class WorkExperience(BaseModel):
    id: str
    company: str
    role: str
    startDate: str
    endDate: str
    current: bool
    description: str
    tags: List[str]


class ResumeData(BaseModel):
    name: str
    email: str
    phone: str
    location: str
    role: str
    experience: List[WorkExperience]


class GeneratePreviewRequest(BaseModel):
    resume: ResumeData
    job_description: str = ""
    variant: str = "standard"


class GeneratePackageRequest(BaseModel):
    resume: ResumeData
    job_description: str
    company_name: str
    variant: str
    include_cover_letter: bool = True
    use_ai_judge: bool = False


class PackageResponse(BaseModel):
    resume_markdown: str
    cover_letter_markdown: Optional[str] = None
    analysis: Optional[str] = None


# --- v1 API Pydantic Models ---


class V1RenderPdfRequest(BaseModel):
    """Request model for POST /v1/render/pdf"""

    resume_data: Dict[str, Any]
    variant: str = "base"


class V1TailorRequest(BaseModel):
    """Request model for POST /v1/tailor"""

    resume_data: Dict[str, Any]
    job_description: str


class V1VariantsResponse(BaseModel):
    """Response model for GET /v1/variants"""

    variants: List[str]


# --- Endpoints ---


@app.get("/")
async def health_check():
    return {"status": "ok", "service": "ResumeAI API"}


@app.post("/generate/preview")
async def generate_preview(request: GeneratePreviewRequest):
    """
    Generates a generic preview of the resume based on the data provided.
    """
    try:
        # Convert Pydantic model to dict to mimic YAML loader result
        data_dict = request.resume.model_dump()
        markdown = await asyncio.to_thread(
            template_generator.generate, data_dict, request.variant
        )
        return {"markdown": markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate/pdf")
async def generate_pdf(request: GeneratePreviewRequest):
    """
    Returns a PDF stream of the resume.
    """
    try:
        data_dict = request.resume.model_dump()
        pdf_bytes = template_generator.generate_pdf(data_dict, request.variant)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate/package", response_model=PackageResponse)
async def generate_package(request: GeneratePackageRequest):
    """
    Generates a full application package including tailored resume and cover letter.
    """
    try:
        data_dict = request.resume.model_dump()

        # 1. Tailor Resume
        # Pass JSON string to allow for caching keys
        tailored_markdown = await ai_generator.tailor_resume(
            request.resume.model_dump_json(), request.job_description
        )

        # 2. Generate Cover Letter (if requested)
        cover_letter_md = None
        if request.include_cover_letter:
            cover_letter_md = cover_letter_generator.generate(
                data_dict, request.company_name, request.job_description
            )

        # 3. AI Analysis (if requested)
        analysis_text = None
        if request.use_ai_judge:
            # Logic to generate variations and pick best would go here
            analysis_text = ai_generator.analyze_match(
                data_dict, request.job_description
            )

        return PackageResponse(
            resume_markdown=tailored_markdown,
            cover_letter_markdown=cover_letter_md,
            analysis=analysis_text,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- v1 API Endpoints ---


@app.post("/v1/render/pdf")
async def v1_render_pdf(request: V1RenderPdfRequest):
    """
    Generate a PDF from resume data using resume-cli.

    This endpoint:
    1. Accepts JSON containing resume_data (matching resume.yaml schema) and variant
    2. Dumps resume_data to a temporary resume.yaml
    3. Invokes resume-cli generate --variant {variant} --format pdf
    4. Reads the generated PDF bytes
    5. Cleans up temp files
    6. Returns application/pdf stream

    Note: This is currently a mock implementation. The real implementation would:
    - Call resume-cli via subprocess or direct import
    - Handle actual PDF generation
    - Support multiple template variants
    """
    try:
        # Create a temporary directory for this request
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Step 1: Dump resume_data to temporary resume.yaml
            resume_yaml_path = temp_path / "resume.yaml"
            with open(resume_yaml_path, "w") as f:
                yaml.dump(request.resume_data, f, default_flow_style=False)

            # Step 2: In a real implementation, invoke resume-cli
            # subprocess.run([
            #     "resume-cli", "generate",
            #     "--variant", request.variant,
            #     "--format", "pdf",
            #     "--input", str(resume_yaml_path),
            #     "--output", str(temp_path / "resume.pdf")
            # ], check=True)

            # Step 3: For now, generate a mock PDF
            # In production, this would read the actual generated PDF
            pdf_bytes = (
                b"%PDF-1.4\n% Mock PDF content\n% Variant: " + request.variant.encode()
            )

            # Step 4: Cleanup is handled automatically by tempfile.TemporaryDirectory()

            # Step 5: Return PDF stream
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=resume_{request.variant}.pdf"
                },
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.post("/v1/tailor", response_model=Dict[str, Any])
async def v1_tailor(request: V1TailorRequest):
    """
    Tailor resume data for a specific job description.

    This endpoint:
    1. Accepts JSON containing resume_data and job_description
    2. Initializes AI Generator from resume-cli
    3. Runs tailoring logic (extract keywords, reorder bullets)
    4. Returns JSON with modified resume_data

    Note: This is currently a mock implementation. The real implementation would:
    - Use resume-cli's AI generator with OpenAI/Claude/Gemini
    - Extract keywords from job description using NLP
    - Match keywords with resume skills and experience
    - Reorder bullets to prioritize relevant experience
    - Generate tailored bullet points
    """
    try:
        # In a real implementation, we would:
        # 1. Initialize the AI Generator from resume-cli
        # 2. Extract keywords from job_description using NLP
        # 3. Match keywords with resume skills and experience
        # 4. Reorder bullets to prioritize relevant experience
        # 5. Generate tailored bullet points

        # Mock tailoring logic for now
        tailored_data = request.resume_data.copy()

        # Add a tailoring note to indicate this is tailored
        tailored_data["_tailored"] = True
        tailored_data["_job_description_preview"] = (
            request.job_description[:100] + "..."
        )

        # If experience exists, add a tailored flag to each entry
        if "experience" in tailored_data and isinstance(
            tailored_data["experience"], list
        ):
            for exp in tailored_data["experience"]:
                if isinstance(exp, dict):
                    exp["_tailored"] = True
                    exp["_relevance_score"] = 0.85  # Mock relevance score

        return tailored_data

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Resume tailoring failed: {str(e)}"
        )


@app.get("/v1/variants", response_model=V1VariantsResponse)
async def v1_variants():
    """
    Get list of available resume templates/variants.

    This endpoint:
    1. Returns list of available templates/variants from CLI config
    2. Returns JSON list (e.g., ["base", "backend", "creative"])

    Note: This is currently returning a static list. The real implementation would:
    - Read variants from resume-cli config/templates directory
    - Dynamically discover available templates
    - Support custom template uploads
    """
    try:
        # In a real implementation, we would:
        # 1. Read the resume-cli config file
        # 2. Scan the templates directory for available variants
        # 3. Return the list of discovered variants

        # For now, return a static list of common variants
        variants = ["base", "backend", "creative", "minimal", "professional", "startup"]

        return V1VariantsResponse(variants=variants)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve variants: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    # Use PORT environment variable if available (Cloud Run requirement), else default to 8000 to match frontend
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
