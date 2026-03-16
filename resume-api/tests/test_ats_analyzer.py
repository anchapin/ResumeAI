"""Tests for ATS analyzer module"""

import pytest
from io import BytesIO
from pathlib import Path

from lib.ats.analyzer import ATSAnalyzer
from lib.ats.models import ATSCheckResult, ATSIssue, IssueSeverity, IssueType


class TestATSAnalyzer:
    """Test cases for ATSAnalyzer"""

    def test_analyzer_initialization(self):
        """Test that analyzer initializes correctly"""
        analyzer = ATSAnalyzer()
        assert analyzer is not None

    def test_check_text_file(self):
        """Test checking a plain text file"""
        analyzer = ATSAnalyzer()
        content = "John Doe\nSoftware Engineer\nExperienced developer"
        file_content = BytesIO(content.encode('utf-8'))
        
        result = analyzer.analyze(file_content, 'resume.txt')
        
        assert isinstance(result, ATSCheckResult)
        assert result.file_type == 'txt'
        assert result.word_count > 0
        # Plain text should have high ATS score
        assert result.ats_score >= 70

    def test_check_pdf_file(self):
        """Test checking a PDF file"""
        analyzer = ATSAnalyzer()
        content = b"%PDF-1.4\nTest PDF content"
        file_content = BytesIO(content)
        
        result = analyzer.analyze(file_content, 'resume.pdf')
        
        assert isinstance(result, ATSCheckResult)
        assert result.file_type == 'pdf'
        assert result.word_count >= 0

    def test_check_docx_file(self):
        """Test checking a DOCX file"""
        analyzer = ATSAnalyzer()
        # Minimal valid DOCX structure (ZIP)
        content = b"PK\x03\x04" + b"\x00" * 100
        file_content = BytesIO(content)
        
        result = analyzer.analyze(file_content, 'resume.docx')
        
        assert isinstance(result, ATSCheckResult)
        assert result.file_type == 'docx'

    def test_word_count_calculation(self):
        """Test word count is calculated correctly"""
        analyzer = ATSAnalyzer()
        content = "One two three four five"
        file_content = BytesIO(content.encode('utf-8'))
        
        result = analyzer.analyze(file_content, 'resume.txt')
        
        assert result.word_count == 5

    def test_issue_detection_two_column(self):
        """Test detection of two-column layout issues"""
        analyzer = ATSAnalyzer()
        
        # Simulate content that might indicate two-column
        content = "Column 1 content " * 100 + " Column 2 content " * 100
        file_content = BytesIO(content.encode('utf-8'))
        
        result = analyzer.analyze(file_content, 'resume.pdf')
        
        # Check that issues list exists
        assert isinstance(result.issues, list)

    def test_ats_score_calculation(self):
        """Test ATS score calculation based on issues"""
        analyzer = ATSAnalyzer()
        
        # Simple clean content should score higher
        clean_content = "John Doe\nSoftware Engineer\nPython, JavaScript"
        file_content = BytesIO(clean_content.encode('utf-8'))
        
        result = analyzer.analyze(file_content, 'resume.txt')
        
        # Clean text should have good score
        assert result.ats_score >= 50
        assert 0 <= result.ats_score <= 100

    def test_parseable_flag(self):
        """Test is_parseable flag is set correctly"""
        analyzer = ATSAnalyzer()
        
        # Valid content should be parseable
        content = "Valid resume content"
        file_content = BytesIO(content.encode('utf-8'))
        
        result = analyzer.analyze(file_content, 'resume.txt')
        
        assert isinstance(result.is_parseable, bool)

    def test_unsupported_file_type(self):
        """Test handling of unsupported file types"""
        analyzer = ATSAnalyzer()
        content = b"random data"
        file_content = BytesIO(content)
        
        result = analyzer.analyze(file_content, 'resume.xyz')
        
        assert result.file_type == 'xyz'
        # Unsupported type might have lower parseability
        assert isinstance(result.is_parseable, bool)

    def test_calculation_time_recorded(self):
        """Test that calculation time is recorded"""
        analyzer = ATSAnalyzer()
        content = "Test content for timing"
        file_content = BytesIO(content.encode('utf-8'))
        
        result = analyzer.analyze(file_content, 'resume.txt')
        
        assert result.calculation_time_ms >= 0

    def test_parsed_text_extraction(self):
        """Test that parsed text is extracted"""
        analyzer = ATSAnalyzer()
        content = "John Doe\nSoftware Engineer"
        file_content = BytesIO(content.encode('utf-8'))
        
        result = analyzer.analyze(file_content, 'resume.txt')
        
        assert isinstance(result.parsed_text, str)


class TestATSIssue:
    """Test cases for ATSIssue model"""

    def test_issue_creation(self):
        """Test creating an ATSIssue"""
        issue = ATSIssue(
            issue_type=IssueType.TWO_COLUMN_LAYOUT,
            severity=IssueSeverity.CRITICAL,
            element="two_column_layout",
            description="Two column layout detected",
            page=1,
            fix="Convert to single column"
        )
        
        assert issue.issue_type == IssueType.TWO_COLUMN_LAYOUT
        assert issue.severity == IssueSeverity.CRITICAL
        assert issue.page == 1

    def test_issue_to_dict(self):
        """Test converting issue to dictionary"""
        issue = ATSIssue(
            issue_type=IssueType.IMAGES,
            severity=IssueSeverity.WARNING,
            element="image_element",
            description="Image without alt text",
            fix="Add alt text"
        )
        
        result = issue.to_dict()
        
        assert isinstance(result, dict)
        assert result['type'] == 'images'
        assert result['severity'] == 'warning'
        assert result['fix'] == 'Add alt text'


class TestATSCheckResult:
    """Test cases for ATSCheckResult model"""

    def test_result_creation(self):
        """Test creating an ATSCheckResult"""
        result = ATSCheckResult(
            file_type='pdf',
            ats_score=75,
            is_parseable=True,
            word_count=500
        )
        
        assert result.file_type == 'pdf'
        assert result.ats_score == 75
        assert result.is_parseable is True
        assert result.word_count == 500

    def test_result_to_dict(self):
        """Test converting result to dictionary"""
        result = ATSCheckResult(
            file_type='docx',
            ats_score=80,
            is_parseable=True,
            word_count=450,
            parsed_text="Resume text content",
            calculation_time_ms=150.5
        )
        
        result_dict = result.to_dict()
        
        assert isinstance(result_dict, dict)
        assert result_dict['file_type'] == 'docx'
        assert result_dict['ats_score'] == 80
        assert result_dict['word_count'] == 450

    def test_result_with_issues(self):
        """Test result with issues list"""
        issues = [
            ATSIssue(
                issue_type=IssueType.TABLES,
                severity=IssueSeverity.WARNING,
                element="table",
                description="Complex table detected",
                fix="Simplify table structure"
            )
        ]
        
        result = ATSCheckResult(
            file_type='pdf',
            ats_score=65,
            is_parseable=True,
            word_count=400,
            issues=issues
        )
        
        assert len(result.issues) == 1
        assert result.issues[0].issue_type == IssueType.TABLES


class TestIssueEnums:
    """Test cases for IssueSeverity and IssueType enums"""

    def test_issue_severity_values(self):
        """Test IssueSeverity enum values"""
        assert IssueSeverity.CRITICAL.value == 'critical'
        assert IssueSeverity.WARNING.value == 'warning'
        assert IssueSeverity.INFO.value == 'info'

    def test_issue_type_values(self):
        """Test IssueType enum values"""
        assert IssueType.IMAGES.value == 'images'
        assert IssueType.TABLES.value == 'tables'
        assert IssueType.TWO_COLUMN_LAYOUT.value == 'two_column_layout'
        assert IssueType.SPECIAL_CHARACTERS.value == 'special_characters'
