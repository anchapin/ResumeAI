"""
JobPosting Schema

Based on schema.org JobPosting with extensions.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, validator


class JobPosting(BaseModel):
    """
    Job posting schema.
    
    Based on schema.org JobPosting with custom extensions.
    """
    
    # Required fields
    title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    url: HttpUrl = Field(...)
    
    # Location
    location: Optional[str] = Field(None, max_length=200)
    remote: bool = Field(default=False)
    location_type: Optional[str] = Field(None)  # onsite, hybrid, remote
    
    # Salary
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    salary_currency: str = Field(default="USD", max_length=3)
    salary_period: str = Field(default="yearly")  # yearly, hourly, monthly
    
    # Job details
    description: Optional[str] = Field(None)
    apply_url: Optional[HttpUrl] = Field(None)
    
    # Dates
    posted_date: Optional[datetime] = Field(None)
    
    # Classification
    employment_type: str = Field(default="full-time")  # full-time, part-time, contract, internship
    experience_level: str = Field(default="mid")  # entry, mid, senior, executive
    
    # Extracted data
    skills: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    
    # Source tracking
    source_id: str = Field(...)
    source_name: Optional[str] = Field(None)
    
    # Raw data for reference
    raw_data: Optional[Dict[str, Any]] = Field(None)
    
    @validator('salary_max')
    def validate_salary_range(cls, v, values):
        """Ensure salary_max >= salary_min."""
        if v is not None and values.get('salary_min') is not None:
            if v < values['salary_min']:
                raise ValueError('salary_max must be >= salary_min')
        return v
    
    @validator('employment_type')
    def validate_employment_type(cls, v):
        """Validate employment type."""
        valid_types = ['full-time', 'part-time', 'contract', 'internship', 'temporary']
        if v not in valid_types:
            return 'full-time'
        return v
    
    @validator('experience_level')
    def validate_experience_level(cls, v):
        """Validate experience level."""
        valid_levels = ['entry', 'mid', 'senior', 'executive']
        if v not in valid_levels:
            return 'mid'
        return v
    
    def to_dict(self) -> dict:
        """Convert to dictionary for database storage."""
        return self.dict(exclude={'raw_data'})
    
    def generate_id(self) -> str:
        """Generate unique ID from source and URL."""
        import hashlib
        key = f"{self.source_id}:{self.url}"
        return hashlib.sha256(key.encode()).hexdigest()[:100]


class JobSearchFilters(BaseModel):
    """Search filters for jobs."""
    
    query: Optional[str] = Field(None, max_length=200)
    remote: Optional[bool] = None
    location: Optional[str] = Field(None, max_length=200)
    min_salary: Optional[int] = Field(None, ge=0)
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    skills: Optional[List[str]] = None
    posted_within_days: Optional[int] = Field(None, ge=1)
    
    # Pagination
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    
    # Sorting
    sort_by: str = Field(default="posted_date")  # posted_date, salary, relevance
    sort_order: str = Field(default="desc")  # asc, desc


class JobSearchResponse(BaseModel):
    """Search response."""
    
    jobs: List[JobPosting]
    total: int
    limit: int
    offset: int
    has_more: bool


class SavedJobResponse(BaseModel):
    """Saved job response."""
    
    id: int
    job_id: str
    saved_at: datetime
    notes: Optional[str]
    status: str
    job: JobPosting


class SavedJobsResponse(BaseModel):
    """Saved jobs list response."""
    
    saved_jobs: List[SavedJobResponse]
    total: int
