import os
import re
import json
import asyncio
import tempfile
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Any
from async_lru import alru_cache
from fastapi import FastAPI, HTTPException, Response, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import yaml

# Initialize Generators (Mocks for local API, but v1 uses resume-cli)
class MockTemplateGenerator:
    def generate(self, data: Dict, variant: str) -> str:
        return f"# {data.get('name', 'Resume')}\n\n## {data.get('role', 'Professional')}\n\n*Generated with variant: {variant}*"

    def generate_pdf(self, data: Dict, variant: str) -> bytes:
        return b"%PDF-1.4... (Mock PDF Data)"

# ... (rest of mocks)


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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

        # 1. Prepare tasks for concurrent execution
        tailor_task = ai_generator.tailor_resume(
            request.resume.model_dump_json(), request.job_description
        )

        cover_letter_task = asyncio.sleep(0)
        if request.include_cover_letter:
            cover_letter_task = asyncio.to_thread(
                cover_letter_generator.generate,
                data_dict,
                request.company_name,
                request.job_description,
            )

        analysis_task = asyncio.sleep(0)
        if request.use_ai_judge:
            analysis_task = asyncio.to_thread(
                ai_generator.analyze_match, data_dict, request.job_description
            )

        # 2. Execute all tasks concurrently
        results = await asyncio.gather(tailor_task, cover_letter_task, analysis_task)

        tailored_markdown, cover_letter_md, analysis_text = results

        return PackageResponse(
            resume_markdown=tailored_markdown,
            cover_letter_markdown=cover_letter_md,
            analysis=analysis_text,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- v1 API Endpoints ---


import sys

def json_resume_to_cli_yaml(json_resume: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts JSON Resume format (used by frontend) to the YAML format
    expected by resume-cli, matching its internal schema and template expectations.
    """
    print(f"DEBUG: Processing incoming resume data for: {json_resume.get('basics', {}).get('name')}")
    sys.stdout.flush()
    
    basics = json_resume.get("basics", {})
    location = json_resume.get("location", {})
    
    # Summary handling: Use summary, fallback to label (tagline)
    summary = basics.get("summary", "")
    if not summary:
        summary = basics.get("label", "")
        
    # Improved location handling
    raw_location = location.get("city", "")
    city = raw_location
    state = location.get("region", "VA")
    if "," in raw_location:
        parts = [p.strip() for p in raw_location.split(",")]
        if len(parts) >= 1:
            city = parts[0]
        if len(parts) >= 2:
            state = parts[1]
            
    cli_data = {
        "contact": {
            "name": basics.get("name", "Alex Chapin"),
            "email": basics.get("email", ""),
            "phone": basics.get("phone", ""),
            "location": {
                "city": city,
                "state": state,
                "zip": location.get("postalCode", "")
            },
            "urls": {
                "linkedin": next((p.get("url", "") for p in basics.get("profiles", []) if p.get("network", "").lower() == "linkedin"), ""),
                "github": next((p.get("url", "") for p in basics.get("profiles", []) if p.get("network", "").lower() == "github"), basics.get("url", ""))
            }
        },
        "professional_summary": {
            "base": summary
        },
        "experience": [],
        "education": [],
        "projects": {},
        "skills": {},
        "variants": {
            "base": {
                "summary_key": "base"
            }
        }
    }
    
    # Convert work to experience (resume-cli expects 'experience' list)
    for work in json_resume.get("work", []):
        bullets = []
        raw_summary = work.get("summary", "")
        if raw_summary:
            # Handle both newline-separated and bullet-separated text
            if "•" in raw_summary and "\n" not in raw_summary:
                lines = raw_summary.split("•")
            else:
                lines = raw_summary.split("\n")
                
            for line in lines:
                clean_line = line.strip().lstrip("•").lstrip("-").lstrip("*").strip()
                if clean_line:
                    bullets.append({"text": clean_line})
                
        # End date handling
        is_current = work.get("current", False)
        end_date = work.get("endDate") or work.get("end_date", "")
        if is_current or not end_date or end_date.lower() == "present":
            end_date = "Present"

        cli_data["experience"].append({
            "company": work.get("company", "Company"),
            "title": work.get("position", work.get("role", "Role")),
            "start_date": work.get("startDate", work.get("start_date", "")),
            "end_date": end_date,
            "location": work.get("location", ""),
            "bullets": bullets
        })
        
    # Convert education
    for edu in json_resume.get("education", []):
        inst = edu.get("institution") or edu.get("school")
        if inst:
            cli_data["education"].append({
                "institution": inst,
                "field": edu.get("area") or edu.get("field") or edu.get("major", ""),
                "degree": edu.get("studyType") or edu.get("degree", ""),
                "graduation_date": edu.get("endDate") or edu.get("end_date") or edu.get("date", ""),
                "location": edu.get("location", "")
            })
            
    # Convert projects
    featured_projects = []
    for proj in json_resume.get("projects", []):
        name = proj.get("name") or proj.get("title")
        if name:
            featured_projects.append({
                "name": name,
                "description": proj.get("description") or proj.get("summary", ""),
                "url": proj.get("url") or proj.get("link", ""),
                "highlighted_technologies": proj.get("highlights") or proj.get("tags") or proj.get("technologies", [])
            })
    if featured_projects:
        cli_data["projects"]["featured"] = featured_projects
        
    # Convert skills
    skill_list = json_resume.get("skills", [])
    technical_skills = []
    for skill in skill_list:
        if isinstance(skill, dict):
            name = skill.get("name") or skill.get("skill")
            if name:
                technical_skills.append(name)
        elif isinstance(skill, str):
            technical_skills.append(skill)
    
    if technical_skills:
        cli_data["skills"]["technical_skills"] = technical_skills
            
    return cli_data


@app.post("/v1/render/pdf")
async def v1_render_pdf(request: V1RenderPdfRequest):
    """
    Generate a real PDF from resume data using resume-cli.
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            resume_yaml_path = temp_path / "resume.yaml"
            output_pdf_path = temp_path / "resume.pdf"

            # Step 1: Convert to CLI format and dump to YAML
            cli_data = json_resume_to_cli_yaml(request.resume_data)
            with open(resume_yaml_path, "w") as f:
                yaml.dump(cli_data, f, default_flow_style=False)

            # Step 2: Invoke resume-cli to generate PDF
            # Use absolute path to ensure it's found
            resume_cli_path = "/home/alexc/.local/bin/resume-cli"
            result = subprocess.run([
                resume_cli_path, 
                "--yaml-path", str(resume_yaml_path),
                "generate",
                "--variant", request.variant,
                "--format", "pdf",
                "--output", str(output_pdf_path)
            ], capture_output=True, text=True)

            if result.returncode != 0:
                print(f"CLI Error: {result.stderr}")
                raise Exception(f"resume-cli failed: {result.stderr}")

            # Step 3: Read and return PDF bytes
            if not output_pdf_path.exists():
                raise Exception("PDF file was not generated")
                
            pdf_bytes = output_pdf_path.read_bytes()

            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=resume_{request.variant}.pdf"
                },
            )

    except Exception as e:
        print(f"PDF Generation Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.post("/v1/render/markdown")
async def v1_render_markdown(request: V1RenderPdfRequest):
    """
    Generate a markdown preview from resume data using resume-cli.
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            resume_yaml_path = temp_path / "resume.yaml"

            # Step 1: Convert to CLI format and dump to YAML
            cli_data = json_resume_to_cli_yaml(request.resume_data)
            with open(resume_yaml_path, "w") as f:
                yaml.dump(cli_data, f, default_flow_style=False)

            # Step 2: Invoke resume-cli to generate Markdown
            result = subprocess.run([
                "/home/alexc/.local/bin/resume-cli", 
                "--yaml-path", str(resume_yaml_path),
                "generate",
                "--variant", request.variant,
                "--format", "md",
                "--no-save"
            ], capture_output=True, text=True)

            raw_output = result.stdout if result.returncode == 0 else ""
            
            # Extract content between separators
            if "--------------------------------------------------------------------------------" in raw_output:
                parts = raw_output.split("--------------------------------------------------------------------------------")
                if len(parts) >= 3:
                    markdown = parts[1].strip()
                else:
                    markdown = raw_output.strip()
            else:
                markdown = raw_output.strip() or "Failed to generate preview"

            return {"markdown": markdown}

    except Exception as e:
        print(f"Markdown Generation Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Markdown generation failed: {str(e)}")


@app.post("/v1/tailor", response_model=Dict[str, Any])
async def v1_tailor(request: V1TailorRequest):
    """
    Tailor resume data and provide a markdown preview.
    """
    try:
        # Mock tailoring logic (same as before)
        tailored_data = request.resume_data.copy()
        
        # Add keywords and suggestions as before
        keywords = ["AWS", "Kubernetes", "TypeScript", "Python", "DevOps", "React"]
        suggestions = [
            "Highlight your experience with AWS EKS in the summary.",
            "Include metrics for the 50x throughput increase in the bullets.",
            "Add a dedicated Skills section for cloud infrastructure."
        ]

        # Generate a markdown preview using resume-cli
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            resume_yaml_path = temp_path / "resume.yaml"

            cli_data = json_resume_to_cli_yaml(tailored_data)
            with open(resume_yaml_path, "w") as f:
                yaml.dump(cli_data, f, default_flow_style=False)

            result = subprocess.run([
                "/home/alexc/.local/bin/resume-cli", 
                "--yaml-path", str(resume_yaml_path),
                "generate",
                "--variant", "base",
                "--format", "md",
                "--no-save"
            ], capture_output=True, text=True)

            raw_output = result.stdout if result.returncode == 0 else ""
            
            # Extract content between separators
            if "--------------------------------------------------------------------------------" in raw_output:
                parts = raw_output.split("--------------------------------------------------------------------------------")
                if len(parts) >= 3:
                    markdown_preview = parts[1].strip()
                else:
                    markdown_preview = raw_output.strip()
            else:
                markdown_preview = raw_output.strip() or "Failed to generate preview"

        return {
            "resume_data": tailored_data,
            "keywords": keywords,
            "suggestions": suggestions,
            "markdown": markdown_preview
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Resume tailoring failed: {str(e)}"
        )


@app.get("/v1/variants", response_model=Dict[str, Any])
async def v1_variants():
    """
    Get list of available resume templates/variants.

    This endpoint returns variant metadata as expected by the frontend.
    """
    try:
        # Define common variants with metadata
        variants = [
            {
                "name": "base",
                "display_name": "Base Template",
                "description": "Standard professional resume template.",
                "format": "json",
                "output_formats": ["pdf", "markdown"]
            },
            {
                "name": "backend",
                "display_name": "Backend Engineer",
                "description": "Tailored for backend software engineering roles.",
                "format": "json",
                "output_formats": ["pdf", "markdown"]
            },
            {
                "name": "creative",
                "display_name": "Creative Designer",
                "description": "Modern layout for design and creative roles.",
                "format": "json",
                "output_formats": ["pdf", "markdown"]
            }
        ]

        return {"variants": variants}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve variants: {str(e)}"
        )


@app.post("/v1/import/linkedin-file")
async def import_linkedin_file(
    files: List[UploadFile] = File(...)
):
    """
    Import resume from LinkedIn exported file (JSON, ZIP, or CSV).
    """
    import io
    import csv
    import zipfile
    
    print(f"DEBUG: LinkedIn Import started with {len(files)} files")
    sys.stdout.flush()
    
    try:
        csv_files = {}
        json_data = None
        
        for file in files:
            print(f"DEBUG: Processing file: {file.filename} ({file.content_type})")
            content = await file.read()
            
            if file.filename.endswith('.json'):
                try:
                    json_data = json.loads(content.decode('utf-8'))
                    print("DEBUG: Found valid JSON data")
                except:
                    print(f"DEBUG: Failed to parse JSON from {file.filename}")
            elif file.filename.endswith('.zip'):
                print("DEBUG: Processing ZIP file")
                try:
                    with zipfile.ZipFile(io.BytesIO(content)) as z:
                        for name in z.namelist():
                            if name.endswith('.csv'):
                                csv_files[name] = z.read(name)
                                print(f"DEBUG: Extracted CSV from ZIP: {name}")
                except Exception as e:
                    print(f"DEBUG: ZIP error: {str(e)}")
            elif file.filename.endswith('.csv'):
                csv_files[file.filename] = content
                print(f"DEBUG: Found direct CSV file: {file.filename}")

        # If we have JSON data, use it (it's usually more complete)
        if json_data:
            return _process_linkedin_json(json_data)
        
        # If we have CSV files, process them
        if csv_files:
            return _process_linkedin_csvs(csv_files)
            
        raise Exception("No valid LinkedIn data found in files (expected .json, .zip, or .csv)")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"LinkedIn Import Error: {str(e)}")
        sys.stdout.flush()
        raise HTTPException(
            status_code=500, detail=f"Failed to import LinkedIn file: {str(e)}"
        )

def _process_linkedin_json(all_data):
    # Mapping from LinkedIn JSON to our internal ResumeData format
    profile = all_data if 'firstName' in all_data else all_data.get('profile', {})
    
    # Debug profile keys
    print(f"DEBUG: LinkedIn JSON Profile Keys: {list(profile.keys())}")
    
    first_name = profile.get('firstName', '')
    last_name = profile.get('lastName', '')
    
    # Flexible location extraction
    loc_name = ""
    # Try multiple common keys for location
    for loc_key in ['location', 'locationName', 'geoLocation', 'address', 'city']:
        if loc_key in profile:
            loc = profile[loc_key]
            if isinstance(loc, dict):
                loc_name = loc.get('name') or loc.get('city') or loc.get('preferredName') or ""
            else:
                loc_name = str(loc)
            if loc_name:
                print(f"DEBUG: Found location using key '{loc_key}': {loc_name}")
                break
    
    # Clean up location string (remove hybrid/remote notes)
    if loc_name:
        loc_name = re.sub(r'\s*\(.*\)', '', loc_name).strip()
    
    resume_data = {
        "basics": {
            "name": f"{first_name} {last_name}".strip() or "Imported User",
            "email": profile.get('emailAddress', ''),
            "phone": profile.get('phoneNumber', ''),
            "summary": profile.get('summary', ''),
            "label": profile.get('headline', '')
        },
        "location": {
            "city": loc_name
        },
        "work": [],
        "education": [],
        "skills": [],
        "projects": []
    }
    ...

    # Map experience
    positions = all_data.get('positions', [])
    for pos in positions:
        resume_data["work"].append({
            "company": pos.get('companyName', ''),
            "position": pos.get('title', ''),
            "startDate": f"{pos.get('startedOn', {}).get('month', '01')}/{pos.get('startedOn', {}).get('year', '')}",
            "endDate": f"{pos.get('finishedOn', {}).get('month', '01')}/{pos.get('finishedOn', {}).get('year', '')}" if pos.get('finishedOn') else "Present",
            "summary": pos.get('description', ''),
            "highlights": []
        })

    # Map education
    education = all_data.get('educations', [])
    for edu in education:
        resume_data["education"].append({
            "institution": edu.get('schoolName', ''),
            "area": edu.get('fieldOfStudy', ''),
            "studyType": edu.get('degreeName', ''),
            "startDate": str(edu.get('startDate', {}).get('year', '')),
            "endDate": str(edu.get('endDate', {}).get('year', '')),
            "courses": []
        })

    # Map skills
    skills = all_data.get('skills', [])
    for skill in skills:
        skill_name = skill.get('name') if isinstance(skill, dict) else skill
        if skill_name:
            resume_data["skills"].append(skill_name)

    return resume_data

def _process_linkedin_csvs(csv_files):
    import io
    import csv
    
    linkedin_data = {}
    
    # helper to parse a csv with encoding fallback
    def parse_csv(content_bytes):
        try:
            content = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            try:
                content = content_bytes.decode('utf-16')
            except UnicodeDecodeError:
                content = content_bytes.decode('latin-1')
        
        try:
            return list(csv.DictReader(io.StringIO(content)))
        except:
            return []

    # Map filenames to keys
    for filename, content in csv_files.items():
        if "Profile.csv" in filename:
            rows = parse_csv(content)
            if rows: linkedin_data['profile'] = rows[0]
        elif "Positions.csv" in filename:
            linkedin_data['positions'] = parse_csv(content)
        elif "Education.csv" in filename:
            linkedin_data['education'] = parse_csv(content)
        elif "Skills.csv" in filename:
            linkedin_data['skills'] = parse_csv(content)
        elif "Email Addresses.csv" in filename:
            linkedin_data['emails'] = parse_csv(content)
        elif "Phone Numbers.csv" in filename:
            linkedin_data['phones'] = parse_csv(content)

    profile = linkedin_data.get('profile', {})
    print(f"DEBUG: LinkedIn CSV Profile Keys: {list(profile.keys())}")
    
    emails = linkedin_data.get('emails', [])
    phones = linkedin_data.get('phones', [])
    
    # Extract email and phone from separate files if needed
    email = profile.get('Email Address', '')
    if not email and emails:
        email = emails[0].get('Email Address', '')
        
    phone = ""
    if phones:
        phone = phones[0].get('Number', '')
    
    # Flexible location extraction for CSV
    location_city = (
        profile.get('Address', '') or 
        profile.get('Location', '') or 
        profile.get('City', '') or
        profile.get('Geo Location', '')
    )
    
    # Clean up location string
    if location_city:
        location_city = re.sub(r'\s*\(.*\)$', '', location_city).strip()
        print(f"DEBUG: Found CSV location: {location_city}")
    
    resume_data = {
        "basics": {
            "name": f"{profile.get('First Name', '')} {profile.get('Last Name', '')}".strip() or "Imported User",
            "email": email,
            "phone": phone,
            "summary": profile.get('Summary', ''),
            "label": profile.get('Headline', '')
        },
        "location": {
            "city": location_city
        },
        "work": [],
        "education": [],
        "skills": [],
        "projects": []
    }

    for pos in linkedin_data.get('positions', []):
        resume_data["work"].append({
            "company": pos.get('Company Name', ''),
            "position": pos.get('Title', ''),
            "startDate": pos.get('Started On', ''),
            "endDate": pos.get('Finished On', '') or "Present",
            "summary": pos.get('Description', ''),
            "highlights": []
        })

    for edu in linkedin_data.get('education', []):
        resume_data["education"].append({
            "institution": edu.get('School Name', ''),
            "area": edu.get('Notes', '') or edu.get('Field of Study', ''),
            "studyType": edu.get('Degree Name', ''),
            "startDate": edu.get('Started On', ''),
            "endDate": edu.get('Finished On', ''),
            "courses": []
        })

    for skill in linkedin_data.get('skills', []):
        name = skill.get('Name')
        if name: resume_data["skills"].append(name)

    return resume_data


if __name__ == "__main__":
    import uvicorn

    # Use PORT environment variable if available (Cloud Run requirement), else default to 8000 to match frontend
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
