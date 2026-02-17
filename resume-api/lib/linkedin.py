"""
LinkedIn Integration Library

Provides functionality to import LinkedIn profile data and export resumes
in LinkedIn-friendly formats.

Supports multiple LinkedIn export formats:
- LinkedIn Data Export (JSON format from Settings > Data privacy)
- LinkedIn Profile Scraper API format
- Manual JSON format with common field names
"""

from typing import Dict, Any, Optional, List
import re


class LinkedInImporter:
    """Handles importing and parsing LinkedIn data exports."""

    def __init__(self):
        self.field_mappings = {
            # Standard LinkedIn export fields
            "firstName": "first_name",
            "lastName": "last_name",
            "headline": "headline",
            "locationName": "location",
            "industryName": "industry",
            "summary": "summary",
            "emailAddress": "email",
            "phoneNumbers": "phones",
            "positions": "experience",
            "educations": "education",
            "skills": "skills",
            "languages": "languages",
            "certifications": "certifications",
            "projects": "projects",
            "publications": "publications",
            "patents": "patents",
            "volunteer": "volunteer",
            # Alternative field names from different export formats
            "fullName": "name",
            "name": "name",
            "email": "email",
            "phone": "phone",
            "location": "location",
            "city": "location",
            "experience": "experience",
            "education": "education",
        }

    def detect_format(self, data: Dict[str, Any]) -> str:
        """
        Detect the format of LinkedIn export data.

        Args:
            data: Raw LinkedIn export data

        Returns:
            Format type: 'standard', 'scraper', 'minimal', or 'unknown'
        """
        if "firstName" in data or "lastName" in data:
            return "standard"
        elif "fullName" in data or "profileUrl" in data:
            return "scraper"
        elif "name" in data and ("experience" in data or "education" in data):
            return "minimal"
        return "unknown"

    def parse_export(self, data: Dict[str, Any], mode: str = "merge") -> Dict[str, Any]:
        """
        Parse LinkedIn export data and convert to resume format.

        Args:
            data: Raw LinkedIn export data
            mode: 'merge' to combine with existing data, 'overwrite' to replace

        Returns:
            Dictionary in resume format
        """
        # Detect format and normalize
        format_type = self.detect_format(data)

        if format_type == 'scraper':
            return self._parse_scraper_format(data)
        elif format_type == 'minimal':
            return self._parse_minimal_format(data)
        else:
            return self._parse_standard_format(data)

    def _parse_standard_format(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse standard LinkedIn export format."""
        result = {}

        # Basic profile info
        if "firstName" in data or "lastName" in data:
            result["name"] = (
                f"{data.get('firstName', '')} {data.get('lastName', '')}".strip()
            )

        if "headline" in data:
            result["role"] = data["headline"]
            result["headline"] = data["headline"]

        if "summary" in data:
            result["summary"] = data["summary"]

        # Contact info
        if "emailAddress" in data:
            result["email"] = data["emailAddress"]

        if "phoneNumbers" in data:
            phones = data["phoneNumbers"]
            if isinstance(phones, list) and phones:
                result["phone"] = phones[0].get("phoneNumber", "")

        if "locationName" in data:
            result["location"] = data["locationName"]

        # Experience
        if "positions" in data:
            result["experience"] = self._parse_positions(data["positions"])

        # Education
        if "educations" in data:
            result["education"] = self._parse_educations(data["educations"])

        # Skills
        if "skills" in data:
            result["skills"] = self._parse_skills(data["skills"])

        # Languages
        if "languages" in data:
            result["languages"] = self._parse_languages(data["languages"])

        # Projects
        if "projects" in data:
            result["projects"] = self._parse_projects(data["projects"])

        # Certifications
        if 'certifications' in data:
            result['certifications'] = self._parse_certifications(data['certifications'])

        # Volunteer
        if 'volunteer' in data:
            result['volunteer'] = self._parse_volunteer(data['volunteer'])

        return result

    def _parse_scraper_format(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse LinkedIn profile scraper API format."""
        result = {}

        # Basic info
        if 'fullName' in data:
            result['name'] = data['fullName']
        elif 'name' in data:
            result['name'] = data['name']

        if 'headline' in data:
            result['headline'] = data['headline']

        if 'summary' in data or 'about' in data:
            result['summary'] = data.get('summary') or data.get('about', '')

        # Contact info
        if 'email' in data:
            result['email'] = data['email']

        if 'phone' in data:
            result['phone'] = data['phone']

        # Location handling - can be string or object
        location = data.get('location') or data.get('city')
        if location:
            if isinstance(location, dict):
                result['location'] = location.get('city') or location.get('name', '')
            else:
                result['location'] = str(location)

        # Experience
        if 'experience' in data:
            result['experience'] = self._parse_scraper_experience(data['experience'])

        # Education
        if 'education' in data:
            result['education'] = self._parse_scraper_education(data['education'])

        # Skills
        if 'skills' in data:
            result['skills'] = self._parse_scraper_skills(data['skills'])

        return result

    def _parse_minimal_format(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse minimal/custom LinkedIn export format."""
        result = {}

        # Basic info
        if 'name' in data:
            result['name'] = data['name']

        if 'headline' in data or 'title' in data or 'role' in data:
            result['headline'] = data.get('headline') or data.get('title') or data.get('role', '')

        if 'summary' in data or 'bio' in data or 'about' in data:
            result['summary'] = data.get('summary') or data.get('bio') or data.get('about', '')

        # Contact info
        if 'email' in data:
            result['email'] = data['email']

        if 'phone' in data:
            result['phone'] = data['phone']

        if 'location' in data or 'city' in data:
            result['location'] = data.get('location') or data.get('city', '')

        # Experience
        if 'experience' in data:
            result['experience'] = self._parse_minimal_experience(data['experience'])

        # Education
        if 'education' in data:
            result['education'] = self._parse_minimal_education(data['education'])

        # Skills
        if 'skills' in data:
            result['skills'] = self._parse_minimal_skills(data['skills'])

        return result

    def _parse_positions(self, positions: List[Dict]) -> List[Dict]:
        """Parse LinkedIn positions to experience format."""
        experience = []
        for pos in positions:
            exp = {
                "id": str(hash(f"{pos.get('companyName', '')}{pos.get('title', '')}"))[
                    :8
                ],
                "company": pos.get("companyName", ""),
                "role": pos.get("title", ""),
                "startDate": self._parse_date(
                    pos.get("timePeriod", {}).get("startDate")
                ),
                "endDate": self._parse_date(pos.get("timePeriod", {}).get("endDate")),
                "current": not pos.get("timePeriod", {}).get("endDate"),
                "description": pos.get("description", ""),
            }

            # Extract company details
            if "company" in pos:
                company = pos["company"]
                if isinstance(company, dict):
                    exp["company"] = company.get("name", exp["company"])

            experience.append(exp)

        return experience

    def _parse_educations(self, educations: List[Dict]) -> List[Dict]:
        """Parse LinkedIn educations to education format."""
        education = []
        for edu in educations:
            ed = {
                "id": str(
                    hash(f"{edu.get('schoolName', '')}{edu.get('degreeName', '')}")
                )[:8],
                "institution": edu.get("schoolName", ""),
                "area": edu.get("fieldOfStudy", ""),
                "studyType": edu.get("degreeName", ""),
                "startDate": str(
                    edu.get("timePeriod", {}).get("startDate", {}).get("year", "")
                ),
                "endDate": str(
                    edu.get("timePeriod", {}).get("endDate", {}).get("year", "")
                ),
            }
            education.append(ed)

        return education

    def _parse_skills(self, skills: List[Dict]) -> List[str]:
        """Parse LinkedIn skills to simple list."""
        skill_list = []
        for skill in skills:
            if isinstance(skill, dict):
                name = skill.get("name", "")
                if name:
                    skill_list.append(name)
            elif isinstance(skill, str):
                skill_list.append(skill)
        return skill_list

    def _parse_languages(self, languages: List[Dict]) -> List[Dict]:
        """Parse LinkedIn languages."""
        langs = []
        for lang in languages:
            if isinstance(lang, dict):
                langs.append(
                    {
                        "name": lang.get("name", ""),
                        "proficiency": lang.get("proficiency", ""),
                    }
                )
        return langs

    def _parse_projects(self, projects: List[Dict]) -> List[Dict]:
        """Parse LinkedIn projects."""
        proj_list = []
        for proj in projects:
            if isinstance(proj, dict):
                proj_list.append(
                    {
                        "id": str(hash(proj.get("name", "")))[:8],
                        "name": proj.get("name", ""),
                        "description": proj.get("description", ""),
                        "url": proj.get("url", ""),
                    }
                )
        return proj_list

    def _parse_date(self, date_obj: Optional[Dict]) -> str:
        """Parse LinkedIn date to string format."""
        if not date_obj:
            return ""

        month = date_obj.get("month", "")
        year = date_obj.get("year", "")

        if month and year:
            return f"{month:02d}/{year}"
        elif year:
            return str(year)
        return ""

    def _parse_scraper_experience(self, experience: List[Dict]) -> List[Dict]:
        """Parse scraper API experience format."""
        result = []
        for exp in experience:
            entry = {
                'id': str(hash(f"{exp.get('companyName', '')}{exp.get('title', '')}"))[:8],
                'company': exp.get('companyName', '') or exp.get('company', ''),
                'role': exp.get('title', '') or exp.get('position', ''),
                'description': exp.get('description', '') or exp.get('summary', ''),
            }

            # Handle date formats from scraper
            start_date = exp.get('startDate', '')
            end_date = exp.get('endDate', '')

            if start_date:
                entry['startDate'] = self._normalize_date(start_date)
            if end_date and end_date.lower() not in ['present', 'current', 'now']:
                entry['endDate'] = self._normalize_date(end_date)
            else:
                entry['current'] = True
                entry['endDate'] = ''

            result.append(entry)
        return result

    def _parse_scraper_education(self, education: List[Dict]) -> List[Dict]:
        """Parse scraper API education format."""
        result = []
        for edu in education:
            entry = {
                'id': str(hash(f"{edu.get('schoolName', '')}{edu.get('degreeName', '')}"))[:8],
                'institution': edu.get('schoolName', '') or edu.get('institution', ''),
                'studyType': edu.get('degreeName', '') or edu.get('degree', ''),
                'area': edu.get('fieldOfStudy', '') or edu.get('area', ''),
            }

            start_date = edu.get('startDate', '')
            end_date = edu.get('endDate', '')

            if start_date:
                entry['startDate'] = self._normalize_date(start_date)
            if end_date:
                entry['endDate'] = self._normalize_date(end_date)

            result.append(entry)
        return result

    def _parse_scraper_skills(self, skills: List) -> List[str]:
        """Parse scraper API skills format."""
        result = []
        for skill in skills:
            if isinstance(skill, str):
                result.append(skill)
            elif isinstance(skill, dict):
                name = skill.get('name', '') or skill.get('skill', '')
                if name:
                    result.append(name)
        return result

    def _parse_minimal_experience(self, experience: List[Dict]) -> List[Dict]:
        """Parse minimal format experience."""
        result = []
        for exp in experience:
            entry = {
                'id': str(hash(f"{exp.get('company', '')}{exp.get('role', '')}{exp.get('position', '')}"))[:8],
                'company': exp.get('company', ''),
                'role': exp.get('role', '') or exp.get('position', '') or exp.get('title', ''),
                'description': exp.get('description', '') or exp.get('summary', '') or exp.get('details', ''),
            }

            # Handle various date formats
            start = exp.get('startDate', '') or exp.get('start_date', '') or exp.get('from', '')
            end = exp.get('endDate', '') or exp.get('end_date', '') or exp.get('to', '')
            current = exp.get('current', False) or exp.get('present', False) or exp.get('to', '').lower() in ['present', 'current', 'now']

            if start:
                entry['startDate'] = self._normalize_date(start)
            if end and not current:
                entry['endDate'] = self._normalize_date(end)
            else:
                entry['current'] = True
                entry['endDate'] = ''

            result.append(entry)
        return result

    def _parse_minimal_education(self, education: List[Dict]) -> List[Dict]:
        """Parse minimal format education."""
        result = []
        for edu in education:
            entry = {
                'id': str(hash(f"{edu.get('institution', '')}{edu.get('degree', '')}"))[:8],
                'institution': edu.get('institution', '') or edu.get('school', '') or edu.get('university', ''),
                'studyType': edu.get('studyType', '') or edu.get('degree', '') or edu.get('degree_type', ''),
                'area': edu.get('area', '') or edu.get('major', '') or edu.get('field_of_study', ''),
            }

            start = edu.get('startDate', '') or edu.get('start_date', '') or edu.get('from', '')
            end = edu.get('endDate', '') or edu.get('end_date', '') or edu.get('to', '')

            if start:
                entry['startDate'] = self._normalize_date(start)
            if end:
                entry['endDate'] = self._normalize_date(end)

            result.append(entry)
        return result

    def _parse_minimal_skills(self, skills: List) -> List[str]:
        """Parse minimal format skills."""
        result = []
        for skill in skills:
            if isinstance(skill, str):
                result.append(skill)
            elif isinstance(skill, dict):
                name = skill.get('name', '') or skill.get('skill', '') or skill.get('title', '')
                if name:
                    result.append(name)
        return result

    def _parse_certifications(self, certifications: List[Dict]) -> List[Dict]:
        """Parse LinkedIn certifications."""
        result = []
        for cert in certifications:
            entry = {
                'id': str(hash(cert.get('name', '')))[:8],
                'name': cert.get('name', '') or cert.get('certificationName', ''),
                'issuer': cert.get('authority', '') or cert.get('issuer', '') or cert.get('organization', ''),
            }

            # Handle dates
            start_date = cert.get('timePeriod', {}).get('startDate', {})
            if start_date:
                entry['startDate'] = self._parse_date(start_date)

            end_date = cert.get('timePeriod', {}).get('endDate', {})
            if end_date:
                entry['endDate'] = self._parse_date(end_date)

            if cert.get('displaySource'):
                entry['url'] = cert['displaySource']

            result.append(entry)
        return result

    def _parse_volunteer(self, volunteer: List[Dict]) -> List[Dict]:
        """Parse LinkedIn volunteer experience."""
        result = []
        for vol in volunteer:
            entry = {
                'id': str(hash(f"{vol.get('organizationName', '')}{vol.get('role', '')}"))[:8],
                'organization': vol.get('organizationName', '') or vol.get('organization', ''),
                'role': vol.get('role', '') or vol.get('position', '') or vol.get('title', ''),
                'description': vol.get('description', ''),
            }

            # Handle dates
            time_period = vol.get('timePeriod', {})
            if time_period:
                start_date = time_period.get('startDate', {})
                end_date = time_period.get('endDate', {})
                if start_date:
                    entry['startDate'] = self._parse_date(start_date)
                if end_date:
                    entry['endDate'] = self._parse_date(end_date)
                else:
                    entry['current'] = True

            result.append(entry)
        return result

    def _normalize_date(self, date_str: str) -> str:
        """
        Normalize various date formats to YYYY-MM or YYYY format.

        Handles formats like:
        - "Jan 2020", "January 2020"
        - "01/2020", "1/2020"
        - "2020-01", "2020"
        - "2020-01-15"
        """
        if not date_str:
            return ''

        date_str = str(date_str).strip()

        # Already in YYYY-MM format
        if re.match(r'^\d{4}-\d{2}$', date_str):
            return date_str

        # Just year
        if re.match(r'^\d{4}$', date_str):
            return date_str

        # Month name year format (Jan 2020, January 2020)
        month_names = {
            'jan': '01', 'january': '01',
            'feb': '02', 'february': '02',
            'mar': '03', 'march': '03',
            'apr': '04', 'april': '04',
            'may': '05',
            'jun': '06', 'june': '06',
            'jul': '07', 'july': '07',
            'aug': '08', 'august': '08',
            'sep': '09', 'september': '09',
            'oct': '10', 'october': '10',
            'nov': '11', 'november': '11',
            'dec': '12', 'december': '12',
        }

        match = re.match(r'(\w+)\s+(\d{4})', date_str, re.IGNORECASE)
        if match:
            month_str, year = match.groups()
            month = month_names.get(month_str.lower())
            if month:
                return f"{year}-{month}"

        # MM/YYYY or M/YYYY format
        match = re.match(r'(\d{1,2})/(\d{4})', date_str)
        if match:
            month, year = match.groups()
            return f"{year}-{month.zfill(2)}"

        # YYYY-MM-DD format
        match = re.match(r'(\d{4})-(\d{2})-(\d{2})', date_str)
        if match:
            year, month, _ = match.groups()
            return f"{year}-{month}"

        return date_str


class LinkedInExporter:
    """Handles exporting resume data in LinkedIn-friendly formats."""

    def to_linkedin_profile(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert resume data to LinkedIn profile import format.

        This creates a JSON structure that can be imported into LinkedIn
        or used for other purposes.
        """
        profile = {}

        # Split name into first/last
        name = resume_data.get("name", "").split(" ", 1)
        profile["firstName"] = name[0] if name else ""
        profile["lastName"] = name[1] if len(name) > 1 else ""

        profile["headline"] = resume_data.get("role", "")
        profile["summary"] = resume_data.get("summary", "")
        profile["locationName"] = resume_data.get("location", "")

        # Email
        if resume_data.get("email"):
            profile["emailAddress"] = resume_data["email"]

        # Phone
        if resume_data.get("phone"):
            profile["phoneNumbers"] = [{"phoneNumber": resume_data["phone"]}]

        # Experience
        experience = resume_data.get("experience", [])
        if experience:
            profile["positions"] = self._format_positions(experience)

        # Education
        education = resume_data.get("education", [])
        if education:
            profile["educations"] = self._format_educations(education)

        # Skills
        skills = resume_data.get("skills", [])
        if skills:
            profile["skills"] = [{"name": s} for s in skills]

        return profile

    def _format_positions(self, experience: List[Dict]) -> List[Dict]:
        """Format experience for LinkedIn."""
        positions = []
        for exp in experience:
            pos = {
                "companyName": exp.get("company", ""),
                "title": exp.get("role", ""),
                "description": exp.get("description", ""),
            }

            # Date handling
            start = exp.get("startDate", "")
            end = exp.get("endDate", "Present" if exp.get("current") else "")

            if start:
                parts = start.split("/")
                if len(parts) == 2:
                    pos["timePeriod"] = {
                        "startDate": {"month": int(parts[0]), "year": int(parts[1])}
                    }
                    if end and end != "Present":
                        end_parts = end.split("/")
                        if len(end_parts) == 2:
                            pos["timePeriod"]["endDate"] = {
                                "month": int(end_parts[0]),
                                "year": int(end_parts[1]),
                            }
                elif len(parts) == 1:
                    pos["timePeriod"] = {"startDate": {"year": int(parts[0])}}

            positions.append(pos)

        return positions

    def _format_educations(self, education: List[Dict]) -> List[Dict]:
        """Format education for LinkedIn."""
        educations = []
        for edu in education:
            ed = {
                "schoolName": edu.get("institution", ""),
                "fieldOfStudy": edu.get("area", ""),
                "degreeName": edu.get("studyType", ""),
            }

            start = edu.get("startDate", "")
            end = edu.get("endDate", "")

            if start or end:
                ed["timePeriod"] = {}
                if start:
                    ed["timePeriod"]["startDate"] = {"year": int(start)}
                if end:
                    ed["timePeriod"]["endDate"] = {"year": int(end)}

            educations.append(ed)

        return educations

    def to_linkedin_url_format(self, resume_data: Dict[str, Any]) -> str:
        """
        Generate a LinkedIn profile URL with resume data as URL parameters.
        Useful for sharing or applying to jobs.
        """
        # Create a compact URL-encoded summary
        summary_parts = []

        if resume_data.get("name"):
            summary_parts.append(f"name={resume_data['name']}")
        if resume_data.get("role"):
            summary_parts.append(f"title={resume_data['role']}")
        if resume_data.get("location"):
            summary_parts.append(f"loc={resume_data['location']}")
        if resume_data.get("skills"):
            skills = ",".join(resume_data["skills"][:5])  # Limit to 5 skills
            summary_parts.append(f"skills={skills}")

        if summary_parts:
            return f"https://linkedin.com/in/profile?{'&'.join(summary_parts)}"
        return ""
