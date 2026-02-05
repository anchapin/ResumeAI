import tempfile
import shutil
import os
from pathlib import Path
from typing import Dict, Optional, Any
from cli.generators.template import TemplateGenerator
from cli.generators.ai_generator import AIGenerator
from cli.generators.cover_letter_generator import CoverLetterGenerator
from cli.utils.config import Config

def transform_resume_data(flat_data: Dict) -> Dict:
    # Handle location
    location_parts = flat_data.get("location", "").split(",")
    city = location_parts[0].strip() if location_parts else ""
    state = location_parts[1].strip() if len(location_parts) > 1 else ""

    contact = {
        "name": flat_data.get("name", ""),
        "email": flat_data.get("email", ""),
        "phone": flat_data.get("phone", ""),
        "location": {
            "city": city,
            "state": state,
            "zip": ""
        },
        "urls": {}
    }

    experience = []
    for exp in flat_data.get("experience", []):
        desc = exp.get("description", "")
        bullets = []
        if desc:
            for line in desc.split("\n"):
                line = line.strip()
                if not line: continue
                # Remove common bullet markers
                if line.startswith("- ") or line.startswith("• ") or line.startswith("* "):
                    line = line[2:]
                bullets.append({"text": line})

        experience.append({
            "title": exp.get("role", ""),
            "company": exp.get("company", ""),
            "start_date": exp.get("startDate", ""),
            "end_date": exp.get("endDate", ""),
            "location": "",
            "bullets": bullets
        })

    return {
        "contact": contact,
        "professional_summary": {
            "base": f"Experienced {flat_data.get('role', 'Professional')}."
        },
        "experience": experience,
        "skills": {},
        "education": [],
        "projects": {},
        "variants": {}
    }

class ServerTemplateGenerator(TemplateGenerator):
    def __init__(self, data: Dict, config: Optional[Config] = None):
        super().__init__(yaml_path=None, config=config)
        self.yaml_handler._data = transform_resume_data(data)

    def generate(self, data: Dict, variant: str) -> str:
        self.yaml_handler._data = transform_resume_data(data)
        return super().generate(variant=variant, output_format="md")

    def generate_pdf(self, data: Dict, variant: str) -> bytes:
        self.yaml_handler._data = transform_resume_data(data)

        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "resume.pdf"
            try:
                super().generate(
                    variant=variant,
                    output_format="pdf",
                    output_path=output_path
                )
                if output_path.exists():
                    return output_path.read_bytes()
                else:
                    raise RuntimeError("PDF generation failed: Output file not created")
            except Exception as e:
                raise e

class ServerAIGenerator(AIGenerator):
    def __init__(self, config: Optional[Config] = None):
        try:
            super().__init__(yaml_path=None, config=config)
        except (ValueError, ImportError):
            pass
        self.template_generator = ServerTemplateGenerator(data={}, config=config)

    def tailor_resume(self, data: Dict, job_description: str) -> str:
        if not hasattr(self, 'client'):
             try:
                 super().__init__(yaml_path=None, config=self.config)
             except Exception as e:
                 return f"AI Generation Unavailable: {str(e)}"

        self.template_generator.yaml_handler._data = transform_resume_data(data)
        variant = self.config.default_variant
        return self.generate(
            variant=variant,
            job_description=job_description,
            output_format="md"
        )

    def analyze_match(self, resume_data: Dict, job_description: str) -> str:
        if not hasattr(self, 'client'):
             return "AI Analysis Unavailable: Missing API Keys or dependencies."

        prompt = f"""Analyze the match between the candidate and the job description.

Resume Data:
{resume_data}

Job Description:
{job_description}

Provide a match score (0-100) and a brief analysis (2-3 sentences).
Format: "Match Score: X/100. [Analysis]"
"""
        try:
            if self.provider == "anthropic":
                response = self._call_anthropic(prompt)
            else:
                response = self._call_openai(prompt)
            return response
        except Exception as e:
            return f"Analysis failed: {str(e)}"

class ServerCoverLetterGenerator(CoverLetterGenerator):
    def __init__(self, config: Optional[Config] = None):
        try:
            super().__init__(yaml_path=None, config=config)
        except (ValueError, ImportError):
            pass
        self.template_generator = ServerTemplateGenerator(data={}, config=config)
        self.yaml_handler._data = {}

    def generate(self, data: Dict, company_name: str, job_description: str) -> str:
        if not hasattr(self, 'client'):
             return "Cover Letter Generation Unavailable: Missing API Keys or dependencies."

        transformed_data = transform_resume_data(data)
        self.yaml_handler._data = transformed_data
        self.template_generator.yaml_handler._data = transformed_data

        results, details = self.generate_non_interactive(
            job_description=job_description,
            company_name=company_name,
            variant="base",
            output_formats=["md"]
        )
        return results.get("md", "")
