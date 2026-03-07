import sys
import os
os.environ['JWT_SECRET'] = 'x'*32

sys.path.append('resume-api')
sys.path.append('resume_ai_lib/src')

from lib.utils.ats_checker import ATSCompatibilityChecker as ATS_API
from resume_ai_lib.ats_checker import ATSCompatibilityChecker as ATS_LIB

def test_ats_checker():
    # Setup dummy resume data
    resume_data = {
        "basics": {"name": "John Doe", "email": "john@example.com"},
        "work": [{"company": "Acme Corp", "position": "Software Engineer", "summary": "Did 20% more sales with Python and React."}],
        "skills": ["Python", "React", "Docker", "Kubernetes", "SQL", "JavaScript"]
    }

    job_description = "We are looking for a Software Engineer with experience in Python and React. You must have led a team to 20% higher sales."

    for CheckerClass in [ATS_API, ATS_LIB]:
        checker = CheckerClass()
        report = checker.check_compatibility(resume_data, job_description)
        assert getattr(report, "overall_score") > 0, f"Failed for {CheckerClass}"
        assert hasattr(checker, "STOP_WORDS"), f"Missing STOP_WORDS in {CheckerClass}"
        assert isinstance(checker.STOP_WORDS, frozenset), f"STOP_WORDS not a frozenset in {CheckerClass}"

        # Test word count extraction specifically
        keywords = checker._extract_keywords(job_description)
        assert len(keywords) > 0, "No keywords extracted"

    print("All tests passed successfully.")

if __name__ == '__main__':
    test_ats_checker()
