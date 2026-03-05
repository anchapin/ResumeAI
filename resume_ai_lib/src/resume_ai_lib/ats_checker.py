"""
ATS (Applicant Tracking System) Compatibility Checker.

This module provides functionality to check resume compatibility with
Applicant Tracking Systems and provide recommendations for improvement.
"""

import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class ATSCompatibilityReport:
    """Report on ATS compatibility of a resume."""

    overall_score: int = 0
    passed: bool = False
    issues: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    keyword_match_rate: float = 0.0
    formatting_score: int = 0
    content_score: int = 0
    skills_match: Dict[str, Any] = field(default_factory=dict)
    sections_found: List[str] = field(default_factory=list)
    sections_missing: List[str] = field(default_factory=list)


class ATSCompatibilityChecker:
    """Check resume compatibility with Applicant Tracking Systems."""

    REQUIRED_SECTIONS = ["contact", "experience", "education", "skills"]
    RECOMMENDED_SECTIONS = ["summary", "projects", "certifications"]

    ACTION_VERBS = [
        "achieved",
        "accomplished",
        "created",
        "developed",
        "designed",
        "implemented",
        "improved",
        "increased",
        "led",
        "managed",
        "optimized",
        "reduced",
        "streamlined",
        "transformed",
        "built",
        "engineered",
        "architected",
        "deployed",
        "launched",
        "delivered",
    ]

    def check_compatibility(
        self,
        resume_data: Dict[str, Any],
        job_description: Optional[str] = None,
        resume_text: Optional[str] = None,
    ) -> ATSCompatibilityReport:
        """Check ATS compatibility of a resume."""
        report = ATSCompatibilityReport()

        self._check_sections(resume_data, report)
        self._check_content(resume_data, report)

        if resume_text:
            self._check_formatting(resume_text, report)

        if job_description:
            self._check_keyword_matching(resume_data, job_description, report)

        self._calculate_overall_score(report)
        self._generate_recommendations(report)

        return report

    def _check_sections(
        self, resume_data: Dict[str, Any], report: ATSCompatibilityReport
    ) -> None:
        sections_found = []
        sections_missing = []

        section_mapping = {
            "contact": ["basics"],
            "experience": ["work", "experience"],
            "education": ["education"],
            "skills": ["skills"],
            "summary": ["basics.summary", "summary", "professional_summary"],
            "projects": ["projects"],
            "certifications": ["certificates", "certifications"],
        }

        for section_name, field_paths in section_mapping.items():
            found = False
            for field_path in field_paths:
                if self._has_field(resume_data, field_path):
                    found = True
                    break

            if found:
                sections_found.append(section_name)
            elif section_name in self.REQUIRED_SECTIONS:
                sections_missing.append(section_name)

        report.sections_found = sections_found
        report.sections_missing = sections_missing

        for section in sections_missing:
            report.issues.append(
                {
                    "type": "missing_section",
                    "severity": "high",
                    "message": f"Missing required section: {section.title()}",
                    "section": section,
                }
            )

        required_found = len([s for s in sections_found if s in self.REQUIRED_SECTIONS])
        required_total = len(self.REQUIRED_SECTIONS)
        report.formatting_score = (
            int((required_found / required_total) * 100) if required_total > 0 else 0
        )

    def _has_field(self, data: Dict[str, Any], field_path: str) -> bool:
        parts = field_path.split(".")
        current = data

        for part in parts:
            if isinstance(current, dict):
                if part not in current:
                    return False
                current = current[part]
            else:
                return False

        if current is None:
            return False
        if isinstance(current, (list, str)) and len(current) == 0:
            return False

        return True

    def _check_content(
        self, resume_data: Dict[str, Any], report: ATSCompatibilityReport
    ) -> None:
        issues = []

        basics = resume_data.get("basics", {})
        if basics:
            if not basics.get("email"):
                issues.append(
                    {
                        "type": "missing_contact",
                        "severity": "high",
                        "message": "Missing email address",
                    }
                )
            if not basics.get("phone"):
                issues.append(
                    {
                        "type": "missing_contact",
                        "severity": "medium",
                        "message": "Missing phone number (recommended)",
                    }
                )
            if not basics.get("name"):
                issues.append(
                    {
                        "type": "missing_contact",
                        "severity": "high",
                        "message": "Missing name",
                    }
                )

        work = resume_data.get("work", []) or resume_data.get("experience", [])
        if work:
            has_metrics = False
            has_action_verbs = False

            for job in work:
                bullets = job.get("bullets", []) or job.get("highlights", [])
                description = job.get("summary", "") or job.get("description", "")

                all_text = " ".join(
                    [
                        description,
                        " ".join(
                            [
                                b.get("text", str(b)) if isinstance(b, dict) else str(b)
                                for b in bullets
                            ]
                        ),
                    ]
                ).lower()

                if re.search(r"\d+%|\$\d+|\d+\s*[kKmMbB]|\d+x|\d{4}", all_text):
                    has_metrics = True

                for verb in self.ACTION_VERBS:
                    if verb in all_text:
                        has_action_verbs = True
                        break

            if not has_metrics:
                issues.append(
                    {
                        "type": "content_quality",
                        "severity": "medium",
                        "message": "Consider adding quantifiable metrics to your experience",
                    }
                )

            if not has_action_verbs:
                issues.append(
                    {
                        "type": "content_quality",
                        "severity": "medium",
                        "message": "Use strong action verbs to describe your achievements",
                    }
                )

        skills = resume_data.get("skills", [])
        if not skills:
            issues.append(
                {
                    "type": "missing_section",
                    "severity": "high",
                    "message": "Missing skills section",
                }
            )
        elif len(skills) < 5:
            issues.append(
                {
                    "type": "content_quality",
                    "severity": "low",
                    "message": "Consider adding more skills to your resume",
                }
            )

        resume_text = self._extract_resume_text(resume_data)
        word_count = len(resume_text.split())

        if word_count < 300:
            issues.append(
                {
                    "type": "content_length",
                    "severity": "medium",
                    "message": "Resume may be too short (less than 300 words)",
                }
            )
        elif word_count > 2000:
            issues.append(
                {
                    "type": "content_length",
                    "severity": "low",
                    "message": "Resume may be too long (more than 2000 words)",
                }
            )

        report.issues.extend(issues)

    def _check_formatting(
        self, resume_text: str, report: ATSCompatibilityReport
    ) -> None:
        issues = []

        special_chars = re.findall(r"[^\w\s.,;:!?()'\-]", resume_text)
        if len(special_chars) > len(resume_text) * 0.05:
            issues.append(
                {
                    "type": "formatting",
                    "severity": "medium",
                    "message": "Resume contains many special characters that may not parse correctly",
                }
            )

        date_patterns = [
            r"\d{4}\s*[-–]\s*\d{4}",
            r"\d{2}/\d{2}/\d{4}",
            r"[A-Z][a-z]+\s+\d{4}",
        ]

        found_formats = []
        for pattern in date_patterns:
            if re.search(pattern, resume_text, re.IGNORECASE):
                found_formats.append(pattern)

        if len(found_formats) > 1:
            issues.append(
                {
                    "type": "formatting",
                    "severity": "low",
                    "message": "Inconsistent date formats detected",
                }
            )

        report.issues.extend(issues)

    def _check_keyword_matching(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        report: ATSCompatibilityReport,
    ) -> None:
        jd_keywords = self._extract_keywords(job_description)
        resume_text = self._extract_resume_text(resume_data)
        resume_text_lower = resume_text.lower()

        matched_keywords = []
        missing_keywords = []

        for keyword in jd_keywords:
            if keyword.lower() in resume_text_lower:
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)

        match_rate = len(matched_keywords) / len(jd_keywords) if jd_keywords else 0
        report.keyword_match_rate = match_rate

        report.skills_match = {
            "matched": matched_keywords,
            "missing": missing_keywords,
            "match_count": len(matched_keywords),
            "total_keywords": len(jd_keywords),
        }

        if match_rate < 0.5 and jd_keywords:
            report.issues.append(
                {
                    "type": "keyword_match",
                    "severity": "high",
                    "message": f"Low keyword match rate ({match_rate:.0%})",
                    "missing_keywords": missing_keywords[:10],
                }
            )

    def _extract_keywords(self, text: str) -> List[str]:
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "from",
            "as",
            "is",
            "was",
            "are",
            "were",
            "been",
            "be",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "shall",
            "can",
            "need",
            "this",
            "that",
            "these",
            "those",
            "i",
            "you",
            "he",
            "she",
            "it",
            "we",
            "they",
            "what",
            "which",
            "who",
            "whom",
            "whose",
            "where",
            "when",
            "why",
            "how",
            "all",
            "each",
            "every",
            "both",
            "few",
            "more",
            "most",
            "other",
            "some",
            "such",
            "no",
            "nor",
            "not",
            "only",
            "own",
            "same",
            "so",
            "than",
            "too",
            "very",
            "just",
            "also",
            "now",
            "our",
            "your",
            "their",
            "its",
            "his",
            "her",
            "me",
            "us",
            "them",
            "responsibilities",
            "requirements",
            "qualifications",
            "skills",
            "experience",
            "years",
            "work",
            "team",
            "company",
            "role",
            "position",
        }

        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        word_count = {}
        for word in words:
            if word not in stop_words:
                word_count[word] = word_count.get(word, 0) + 1

        sorted_keywords = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
        return [kw for kw, count in sorted_keywords[:30]]

    def _extract_resume_text(self, resume_data: Dict[str, Any]) -> str:
        text_parts = []

        basics = resume_data.get("basics", {})
        for field_name in ["name", "summary", "headline"]:
            if basics.get(field_name):
                text_parts.append(str(basics[field_name]))

        for field_name in ["work", "experience"]:
            if field_name in resume_data and isinstance(resume_data[field_name], list):
                for exp in resume_data[field_name]:
                    if isinstance(exp, dict):
                        for key in [
                            "position",
                            "title",
                            "company",
                            "summary",
                            "description",
                        ]:
                            if exp.get(key):
                                text_parts.append(str(exp[key]))
                        for bullet_key in ["bullets", "highlights"]:
                            if bullet_key in exp and isinstance(exp[bullet_key], list):
                                for bullet in exp[bullet_key]:
                                    if isinstance(bullet, dict) and "text" in bullet:
                                        text_parts.append(str(bullet["text"]))
                                    elif isinstance(bullet, str):
                                        text_parts.append(bullet)

        if "skills" in resume_data:
            skills = resume_data["skills"]
            if isinstance(skills, list):
                for skill in skills:
                    if isinstance(skill, dict):
                        if skill.get("name"):
                            text_parts.append(str(skill["name"]))
                        if skill.get("keywords"):
                            text_parts.extend([str(k) for k in skill["keywords"]])
                    elif isinstance(skill, str):
                        text_parts.append(skill)

        if "education" in resume_data and isinstance(resume_data["education"], list):
            for edu in resume_data["education"]:
                if isinstance(edu, dict):
                    for key in ["institution", "degree", "studyType", "area"]:
                        if edu.get(key):
                            text_parts.append(str(edu[key]))

        if "projects" in resume_data and isinstance(resume_data["projects"], list):
            for proj in resume_data["projects"]:
                if isinstance(proj, dict):
                    for key in ["name", "description"]:
                        if proj.get(key):
                            text_parts.append(str(proj[key]))

        return " ".join(text_parts)

    def _calculate_overall_score(self, report: ATSCompatibilityReport) -> None:
        scores = []

        section_score = report.formatting_score
        scores.append(section_score * 0.4)

        content_issues = len([i for i in report.issues if i.get("severity") == "high"])
        content_score = max(0, 100 - (content_issues * 20))
        scores.append(content_score * 0.4)

        keyword_score = int(report.keyword_match_rate * 100)
        scores.append(keyword_score * 0.2)

        report.overall_score = int(sum(scores))
        report.passed = report.overall_score >= 70
        report.content_score = content_score

    def _generate_recommendations(self, report: ATSCompatibilityReport) -> None:
        recommendations = []

        for section in report.sections_missing:
            recommendations.append(f"Add a '{section.title()}' section to your resume")

        for issue in report.issues:
            issue_type = issue.get("type")

            if issue_type == "missing_contact":
                if "email" in issue.get("message", "").lower():
                    recommendations.append(
                        "Add your email address to the contact section"
                    )
                elif "phone" in issue.get("message", "").lower():
                    recommendations.append("Add your phone number for easier contact")

            elif issue_type == "content_quality":
                if "metrics" in issue.get("message", "").lower():
                    recommendations.append(
                        "Add quantifiable achievements (e.g., 'Increased revenue by 25%')"
                    )
                elif "action verbs" in issue.get("message", "").lower():
                    recommendations.append(
                        "Start bullet points with strong action verbs like 'Achieved', 'Developed', 'Implemented'"
                    )
                elif "skills" in issue.get("message", "").lower():
                    recommendations.append(
                        "Expand your skills section with relevant technologies"
                    )

            elif issue_type == "keyword_match":
                missing = issue.get("missing_keywords", [])
                if missing:
                    recommendations.append(
                        f"Incorporate these keywords from the job description: {', '.join(missing[:5])}"
                    )

        if report.overall_score < 50:
            recommendations.append(
                "Consider using a simple, clean resume template with standard section headings"
            )

        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recommendations.append(rec)

        report.recommendations = unique_recommendations[:10]


def check_ats_compatibility(
    resume_data: Dict[str, Any],
    job_description: Optional[str] = None,
    resume_text: Optional[str] = None,
) -> Dict[str, Any]:
    """Convenience function to check ATS compatibility."""
    checker = ATSCompatibilityChecker()
    report = checker.check_compatibility(resume_data, job_description, resume_text)

    return {
        "overall_score": report.overall_score,
        "passed": report.passed,
        "issues": report.issues,
        "recommendations": report.recommendations,
        "keyword_match_rate": report.keyword_match_rate,
        "formatting_score": report.formatting_score,
        "content_score": report.content_score,
        "skills_match": report.skills_match,
        "sections_found": report.sections_found,
        "sections_missing": report.sections_missing,
    }
