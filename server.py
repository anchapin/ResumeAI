import os
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# NOTE: In a real environment, these would be imported from the CLI package
# from cli.generators.template import TemplateGenerator
# from cli.generators.ai_generator import AIGenerator
# from cli.generators.cover_letter import CoverLetterGenerator
# from cli.utils import ResumeYAML

# Mocking the CLI classes for the purpose of this server implementation
class MockTemplateGenerator:
    def generate(self, data: Dict, variant: str) -> str:
        # Mock markdown generation
        experience_section = self._format_experience(data.get('experience', []))
        
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
    def tailor_resume(self, data: Dict, job_description: str) -> str:
        # Simulate AI tailoring logic
        experience_section = MockTemplateGenerator()._format_experience(data.get('experience', []))
        
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
        experiences = data.get('experience', [])
        latest_company = experiences[0].get('company') if experiences else "my previous roles"
        
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
        data_dict = request.resume.dict()
        markdown = template_generator.generate(data_dict, request.variant)
        return {"markdown": markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/pdf")
async def generate_pdf(request: GeneratePreviewRequest):
    """
    Returns a PDF stream of the resume.
    """
    try:
        data_dict = request.resume.dict()
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
        data_dict = request.resume.dict()
        
        # 1. Tailor Resume
        tailored_markdown = ai_generator.tailor_resume(data_dict, request.job_description)
        
        # 2. Generate Cover Letter (if requested)
        cover_letter_md = None
        if request.include_cover_letter:
            cover_letter_md = cover_letter_generator.generate(
                data_dict, 
                request.company_name, 
                request.job_description
            )
            
        # 3. AI Analysis (if requested)
        analysis_text = None
        if request.use_ai_judge:
            # Logic to generate variations and pick best would go here
            analysis_text = ai_generator.analyze_match(data_dict, request.job_description)

        return PackageResponse(
            resume_markdown=tailored_markdown,
            cover_letter_markdown=cover_letter_md,
            analysis=analysis_text
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable if available (Cloud Run requirement), else default to 8000 to match frontend
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
