"""
JSON Exporter for Resume API.

Exports resume data to JSON Resume standard format with ResumeAI-specific metadata.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from api.models import ResumeData


class JsonExportResult:
    """Result of JSON export operation."""

    def __init__(
        self,
        json_data: Dict[str, Any],
        resume_data: ResumeData,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.json_data = json_data
        self.resume_data = resume_data
        self.metadata = metadata or {}

    def to_json(self, indent: int = 2, ensure_ascii: bool = False) -> str:
        """Convert export result to JSON string."""
        return json.dumps(self.json_data, indent=indent, ensure_ascii=ensure_ascii)


class JsonExporter:
    """
    Export resume data to JSON Resume standard format.

    The JSON Resume schema is an industry standard for resume data.
    See: https://jsonresume.org/schema/

    This exporter:
    - Follows JSON Resume schema closely for compatibility
    - Includes ResumeAI-specific metadata in a separate field
    - Supports round-trip export/import
    - Preserves tailoring changes and version information
    """

    # JSON Resume schema version we target
    SCHEMA_VERSION = "1.0.0"

    # ResumeAI metadata version
    METADATA_VERSION = "1.0.0"

    def __init__(self, include_metadata: bool = True):
        """
        Initialize JSON exporter.

        Args:
            include_metadata: Whether to include ResumeAI-specific metadata
        """
        self.include_metadata = include_metadata

    def export(
        self,
        resume_data: ResumeData,
        metadata: Optional[Dict[str, Any]] = None,
        tailoring_changes: Optional[list] = None,
    ) -> JsonExportResult:
        """
        Export resume data to JSON Resume format.

        Args:
            resume_data: Resume data to export
            metadata: Optional metadata (title, tags, etc.)
            tailoring_changes: Optional list of tailoring changes

        Returns:
            JsonExportResult with JSON data and metadata
        """
        # Build JSON Resume structure
        json_resume = self._build_json_resume(resume_data)

        # Add ResumeAI metadata if requested
        if self.include_metadata:
            json_resume["$resumeai"] = self._build_metadata(
                resume_data, metadata, tailoring_changes
            )

        return JsonExportResult(
            json_data=json_resume,
            resume_data=resume_data,
            metadata=metadata or {},
        )

    def _build_json_resume(self, resume_data: ResumeData) -> Dict[str, Any]:
        """
        Convert ResumeData to JSON Resume format.

        Args:
            resume_data: Internal resume data model

        Returns:
            Dictionary following JSON Resume schema
        """
        result: Dict[str, Any] = {}

        # Add basics section
        if resume_data.basics:
            result["basics"] = self._map_basics(resume_data.basics)

        # Add location if separate
        if resume_data.location:
            # Merge with basics.location if not already present
            if "basics" in result and "location" not in result["basics"]:
                result["basics"]["location"] = self._map_location(resume_data.location)
            elif "basics" not in result:
                result["basics"] = {"location": self._map_location(resume_data.location)}

        # Add profiles
        if resume_data.profiles:
            result["profiles"] = [self._map_profile(p) for p in resume_data.profiles]

        # Add work experience
        if resume_data.work:
            result["work"] = [self._map_work_item(w) for w in resume_data.work]

        # Add volunteer experience
        if resume_data.volunteer:
            result["volunteer"] = [
                self._map_volunteer_item(v) for v in resume_data.volunteer
            ]

        # Add education
        if resume_data.education:
            result["education"] = [
                self._map_education_item(e) for e in resume_data.education
            ]

        # Add awards
        if resume_data.awards:
            result["awards"] = [self._map_award(a) for a in resume_data.awards]

        # Add certificates
        if resume_data.certificates:
            result["certificates"] = [
                self._map_certificate(c) for c in resume_data.certificates
            ]

        # Add publications
        if resume_data.publications:
            result["publications"] = [
                self._map_publication(p) for p in resume_data.publications
            ]

        # Add skills
        if resume_data.skills:
            result["skills"] = [self._map_skill(s) for s in resume_data.skills]

        # Add languages
        if resume_data.languages:
            result["languages"] = [
                self._map_language(l) for l in resume_data.languages
            ]

        # Add interests
        if resume_data.interests:
            result["interests"] = [
                self._map_interest(i) for i in resume_data.interests
            ]

        # Add references
        if resume_data.references:
            result["references"] = [
                self._map_reference(r) for r in resume_data.references
            ]

        # Add projects
        if resume_data.projects:
            result["projects"] = [
                self._map_project_item(p) for p in resume_data.projects
            ]

        return result

    def _map_basics(self, basics) -> Dict[str, Any]:
        """Map BasicInfo to JSON Resume basics."""
        result: Dict[str, Any] = {}

        if basics.name:
            result["name"] = basics.name
        if basics.label:
            result["label"] = basics.label
        if basics.email:
            result["email"] = basics.email
        if basics.phone:
            result["phone"] = basics.phone
        if basics.url:
            result["url"] = basics.url
        if basics.summary:
            result["summary"] = basics.summary
        if basics.location:
            result["location"] = self._map_location(basics.location)
        if basics.profiles:
            result["profiles"] = [self._map_profile(p) for p in basics.profiles]

        return result

    def _map_location(self, location) -> Dict[str, Any]:
        """Map Location to JSON Resume location."""
        result: Dict[str, Any] = {}

        if hasattr(location, "address") and location.address:
            result["address"] = location.address
        if hasattr(location, "postalCode") and location.postalCode:
            result["postalCode"] = location.postalCode
        if hasattr(location, "city") and location.city:
            result["city"] = location.city
        if hasattr(location, "countryCode") and location.countryCode:
            result["countryCode"] = location.countryCode
        if hasattr(location, "region") and location.region:
            result["region"] = location.region

        return result

    def _map_profile(self, profile) -> Dict[str, Any]:
        """Map Profile to JSON Resume profile."""
        result: Dict[str, Any] = {}

        if hasattr(profile, "network") and profile.network:
            result["network"] = profile.network
        if hasattr(profile, "username") and profile.username:
            result["username"] = profile.username
        if hasattr(profile, "url") and profile.url:
            result["url"] = profile.url

        return result

    def _map_work_item(self, work) -> Dict[str, Any]:
        """Map WorkItem to JSON Resume work item."""
        result: Dict[str, Any] = {}

        if hasattr(work, "company") and work.company:
            result["company"] = work.company
        if hasattr(work, "position") and work.position:
            result["position"] = work.position
        if hasattr(work, "startDate") and work.startDate:
            result["startDate"] = work.startDate
        if hasattr(work, "endDate") and work.endDate:
            result["endDate"] = work.endDate
        if hasattr(work, "summary") and work.summary:
            result["summary"] = work.summary
        if hasattr(work, "highlights") and work.highlights:
            result["highlights"] = work.highlights

        return result

    def _map_volunteer_item(self, volunteer) -> Dict[str, Any]:
        """Map volunteer item to JSON Resume volunteer item."""
        if isinstance(volunteer, dict):
            return volunteer
        return volunteer.model_dump(exclude_none=True) if hasattr(volunteer, "model_dump") else {}

    def _map_education_item(self, education) -> Dict[str, Any]:
        """Map EducationItem to JSON Resume education item."""
        result: Dict[str, Any] = {}

        if hasattr(education, "institution") and education.institution:
            result["institution"] = education.institution
        if hasattr(education, "area") and education.area:
            result["area"] = education.area
        if hasattr(education, "studyType") and education.studyType:
            result["studyType"] = education.studyType
        if hasattr(education, "startDate") and education.startDate:
            result["startDate"] = education.startDate
        if hasattr(education, "endDate") and education.endDate:
            result["endDate"] = education.endDate
        if hasattr(education, "courses") and education.courses:
            result["courses"] = education.courses

        return result

    def _map_award(self, award) -> Dict[str, Any]:
        """Map award to JSON Resume award."""
        if isinstance(award, dict):
            return award
        return award.model_dump(exclude_none=True) if hasattr(award, "model_dump") else {}

    def _map_certificate(self, certificate) -> Dict[str, Any]:
        """Map certificate to JSON Resume certificate."""
        if isinstance(certificate, dict):
            return certificate
        return certificate.model_dump(exclude_none=True) if hasattr(certificate, "model_dump") else {}

    def _map_publication(self, publication) -> Dict[str, Any]:
        """Map publication to JSON Resume publication."""
        if isinstance(publication, dict):
            return publication
        return publication.model_dump(exclude_none=True) if hasattr(publication, "model_dump") else {}

    def _map_skill(self, skill) -> Dict[str, Any]:
        """Map Skill to JSON Resume skill."""
        result: Dict[str, Any] = {}

        if hasattr(skill, "name") and skill.name:
            result["name"] = skill.name
        if hasattr(skill, "keywords") and skill.keywords:
            result["keywords"] = skill.keywords

        return result

    def _map_language(self, language) -> Dict[str, Any]:
        """Map language to JSON Resume language."""
        if isinstance(language, dict):
            return language
        return language.model_dump(exclude_none=True) if hasattr(language, "model_dump") else {}

    def _map_interest(self, interest) -> Dict[str, Any]:
        """Map interest to JSON Resume interest."""
        if isinstance(interest, dict):
            return interest
        return interest.model_dump(exclude_none=True) if hasattr(interest, "model_dump") else {}

    def _map_reference(self, reference) -> Dict[str, Any]:
        """Map reference to JSON Resume reference."""
        if isinstance(reference, dict):
            return reference
        return reference.model_dump(exclude_none=True) if hasattr(reference, "model_dump") else {}

    def _map_project_item(self, project) -> Dict[str, Any]:
        """Map ProjectItem to JSON Resume project item."""
        result: Dict[str, Any] = {}

        if hasattr(project, "name") and project.name:
            result["name"] = project.name
        if hasattr(project, "description") and project.description:
            result["description"] = project.description
        if hasattr(project, "url") and project.url:
            result["url"] = project.url
        if hasattr(project, "roles") and project.roles:
            result["roles"] = project.roles
        if hasattr(project, "startDate") and project.startDate:
            result["startDate"] = project.startDate
        if hasattr(project, "endDate") and project.endDate:
            result["endDate"] = project.endDate
        if hasattr(project, "highlights") and project.highlights:
            result["highlights"] = project.highlights

        return result

    def _build_metadata(
        self,
        resume_data: ResumeData,
        metadata: Optional[Dict[str, Any]],
        tailoring_changes: Optional[list],
    ) -> Dict[str, Any]:
        """
        Build ResumeAI-specific metadata.

        Args:
            resume_data: Original resume data
            metadata: User-provided metadata
            tailoring_changes: Tailoring changes if any

        Returns:
            Metadata dictionary
        """
        now = datetime.now(timezone.utc).isoformat()

        meta = {
            "version": self.METADATA_VERSION,
            "exportedAt": now,
            "schemaVersion": self.SCHEMA_VERSION,
            "generator": "ResumeAI",
        }

        # Add user-provided metadata
        if metadata:
            meta["user"] = {
                k: v
                for k, v in metadata.items()
                if k in ["title", "tags", "id", "userId", "template"]
            }

        # Add tailoring changes if present
        if tailoring_changes:
            meta["tailoring"] = {
                "changeCount": len(tailoring_changes),
                "changes": tailoring_changes,
            }

        return meta
