import os
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Import real implementations via adapters
from cli.utils.config import Config
from server_adapters import ServerTemplateGenerator, ServerAIGenerator, ServerCoverLetterGenerator

# Initialize Config
config = Config()

# Generators will be initialized per-request to avoid state leakage
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
        # Initialize generator per request
        generator = ServerTemplateGenerator(data=data_dict, config=config)
        markdown = generator.generate(data_dict, request.variant)
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
        # Initialize generator per request
        generator = ServerTemplateGenerator(data=data_dict, config=config)
        pdf_bytes = generator.generate_pdf(data_dict, request.variant)
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
        
        # Initialize generators per request
        ai_gen = ServerAIGenerator(config=config)

        # 1. Tailor Resume
        tailored_markdown = ai_gen.tailor_resume(data_dict, request.job_description)
        
        # 2. Generate Cover Letter (if requested)
        cover_letter_md = None
        if request.include_cover_letter:
            cl_gen = ServerCoverLetterGenerator(config=config)
            cover_letter_md = cl_gen.generate(
                data_dict, 
                request.company_name, 
                request.job_description
            )
            
        # 3. AI Analysis (if requested)
        analysis_text = None
        if request.use_ai_judge:
            # Logic to generate variations and pick best would go here
            analysis_text = ai_gen.analyze_match(data_dict, request.job_description)

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
