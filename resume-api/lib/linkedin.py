"""
LinkedIn Integration Library

Provides functionality to import LinkedIn profile data and export resumes
in LinkedIn-friendly formats.
"""

from typing import Dict, Any, Optional, List


class LinkedInImporter:
    """Handles importing and parsing LinkedIn data exports."""
    
    def __init__(self):
        self.field_mappings = {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'headline': 'headline',
            'locationName': 'location',
            'industryName': 'industry',
            'summary': 'summary',
            'emailAddress': 'email',
            'phoneNumbers': 'phones',
            'positions': 'experience',
            'educations': 'education',
            'skills': 'skills',
            'languages': 'languages',
            'certifications': 'certifications',
            'projects': 'projects',
            'publications': 'publications',
            'patents': 'patents',
            'volunteer': 'volunteer',
        }
    
    def parse_export(self, data: Dict[str, Any], mode: str = 'merge') -> Dict[str, Any]:
        """
        Parse LinkedIn export data and convert to resume format.
        
        Args:
            data: Raw LinkedIn export data
            mode: 'merge' to combine with existing data, 'overwrite' to replace
            
        Returns:
            Dictionary in resume format
        """
        result = {}
        
        # Basic profile info
        if 'firstName' in data or 'lastName' in data:
            result['name'] = f"{data.get('firstName', '')} {data.get('lastName', '')}".strip()
        
        if 'headline' in data:
            result['role'] = data['headline']
        
        if 'summary' in data:
            result['summary'] = data['summary']
        
        # Contact info
        if 'emailAddress' in data:
            result['email'] = data['emailAddress']
        
        if 'phoneNumbers' in data:
            phones = data['phoneNumbers']
            if isinstance(phones, list) and phones:
                result['phone'] = phones[0].get('phoneNumber', '')
        
        if 'locationName' in data:
            result['location'] = data['locationName']
        
        # Experience
        if 'positions' in data:
            result['experience'] = self._parse_positions(data['positions'])
        
        # Education
        if 'educations' in data:
            result['education'] = self._parse_educations(data['educations'])
        
        # Skills
        if 'skills' in data:
            result['skills'] = self._parse_skills(data['skills'])
        
        # Languages
        if 'languages' in data:
            result['languages'] = self._parse_languages(data['languages'])
        
        # Projects
        if 'projects' in data:
            result['projects'] = self._parse_projects(data['projects'])
        
        return result
    
    def _parse_positions(self, positions: List[Dict]) -> List[Dict]:
        """Parse LinkedIn positions to experience format."""
        experience = []
        for pos in positions:
            exp = {
                'id': str(hash(f"{pos.get('companyName', '')}{pos.get('title', '')}"))[:8],
                'company': pos.get('companyName', ''),
                'role': pos.get('title', ''),
                'startDate': self._parse_date(pos.get('timePeriod', {}).get('startDate')),
                'endDate': self._parse_date(pos.get('timePeriod', {}).get('endDate')),
                'current': not pos.get('timePeriod', {}).get('endDate'),
                'description': pos.get('description', ''),
            }
            
            # Extract company details
            if 'company' in pos:
                company = pos['company']
                if isinstance(company, dict):
                    exp['company'] = company.get('name', exp['company'])
            
            experience.append(exp)
        
        return experience
    
    def _parse_educations(self, educations: List[Dict]) -> List[Dict]:
        """Parse LinkedIn educations to education format."""
        education = []
        for edu in educations:
            ed = {
                'id': str(hash(f"{edu.get('schoolName', '')}{edu.get('degreeName', '')}"))[:8],
                'institution': edu.get('schoolName', ''),
                'area': edu.get('fieldOfStudy', ''),
                'studyType': edu.get('degreeName', ''),
                'startDate': str(edu.get('timePeriod', {}).get('startDate', {}).get('year', '')),
                'endDate': str(edu.get('timePeriod', {}).get('endDate', {}).get('year', '')),
            }
            education.append(ed)
        
        return education
    
    def _parse_skills(self, skills: List[Dict]) -> List[str]:
        """Parse LinkedIn skills to simple list."""
        skill_list = []
        for skill in skills:
            if isinstance(skill, dict):
                name = skill.get('name', '')
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
                langs.append({
                    'name': lang.get('name', ''),
                    'proficiency': lang.get('proficiency', '')
                })
        return langs
    
    def _parse_projects(self, projects: List[Dict]) -> List[Dict]:
        """Parse LinkedIn projects."""
        proj_list = []
        for proj in projects:
            if isinstance(proj, dict):
                proj_list.append({
                    'id': str(hash(proj.get('name', '')))[:8],
                    'name': proj.get('name', ''),
                    'description': proj.get('description', ''),
                    'url': proj.get('url', ''),
                })
        return proj_list
    
    def _parse_date(self, date_obj: Optional[Dict]) -> str:
        """Parse LinkedIn date to string format."""
        if not date_obj:
            return ''
        
        month = date_obj.get('month', '')
        year = date_obj.get('year', '')
        
        if month and year:
            return f"{month:02d}/{year}"
        elif year:
            return str(year)
        return ''


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
        name = resume_data.get('name', '').split(' ', 1)
        profile['firstName'] = name[0] if name else ''
        profile['lastName'] = name[1] if len(name) > 1 else ''
        
        profile['headline'] = resume_data.get('role', '')
        profile['summary'] = resume_data.get('summary', '')
        profile['locationName'] = resume_data.get('location', '')
        
        # Email
        if resume_data.get('email'):
            profile['emailAddress'] = resume_data['email']
        
        # Phone
        if resume_data.get('phone'):
            profile['phoneNumbers'] = [{
                'phoneNumber': resume_data['phone']
            }]
        
        # Experience
        experience = resume_data.get('experience', [])
        if experience:
            profile['positions'] = self._format_positions(experience)
        
        # Education
        education = resume_data.get('education', [])
        if education:
            profile['educations'] = self._format_educations(education)
        
        # Skills
        skills = resume_data.get('skills', [])
        if skills:
            profile['skills'] = [{'name': s} for s in skills]
        
        return profile
    
    def _format_positions(self, experience: List[Dict]) -> List[Dict]:
        """Format experience for LinkedIn."""
        positions = []
        for exp in experience:
            pos = {
                'companyName': exp.get('company', ''),
                'title': exp.get('role', ''),
                'description': exp.get('description', ''),
            }
            
            # Date handling
            start = exp.get('startDate', '')
            end = exp.get('endDate', 'Present' if exp.get('current') else '')
            
            if start:
                parts = start.split('/')
                if len(parts) == 2:
                    pos['timePeriod'] = {
                        'startDate': {'month': int(parts[0]), 'year': int(parts[1])}
                    }
                    if end and end != 'Present':
                        end_parts = end.split('/')
                        if len(end_parts) == 2:
                            pos['timePeriod']['endDate'] = {'month': int(end_parts[0]), 'year': int(end_parts[1])}
                elif len(parts) == 1:
                    pos['timePeriod'] = {
                        'startDate': {'year': int(parts[0])}
                    }
            
            positions.append(pos)
        
        return positions
    
    def _format_educations(self, education: List[Dict]) -> List[Dict]:
        """Format education for LinkedIn."""
        educations = []
        for edu in education:
            ed = {
                'schoolName': edu.get('institution', ''),
                'fieldOfStudy': edu.get('area', ''),
                'degreeName': edu.get('studyType', ''),
            }
            
            start = edu.get('startDate', '')
            end = edu.get('endDate', '')
            
            if start or end:
                ed['timePeriod'] = {}
                if start:
                    ed['timePeriod']['startDate'] = {'year': int(start)}
                if end:
                    ed['timePeriod']['endDate'] = {'year': int(end)}
            
            educations.append(ed)
        
        return educations
    
    def to_linkedin_url_format(self, resume_data: Dict[str, Any]) -> str:
        """
        Generate a LinkedIn profile URL with resume data as URL parameters.
        Useful for sharing or applying to jobs.
        """
        # Create a compact URL-encoded summary
        summary_parts = []
        
        if resume_data.get('name'):
            summary_parts.append(f"name={resume_data['name']}")
        if resume_data.get('role'):
            summary_parts.append(f"title={resume_data['role']}")
        if resume_data.get('location'):
            summary_parts.append(f"loc={resume_data['location']}")
        if resume_data.get('skills'):
            skills = ','.join(resume_data['skills'][:5])  # Limit to 5 skills
            summary_parts.append(f"skills={skills}")
        
        if summary_parts:
            return f"https://linkedin.com/in/profile?{'&'.join(summary_parts)}"
        return ""
