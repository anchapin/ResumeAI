#!/usr/bin/env python3
"""
Validation script for Phase 1.1 acceptance criteria.

This script verifies that:
1. resume-api/ directory exists with proper structure
2. resume-cli code is vendored in resume-api/lib/
3. requirements.txt contains necessary dependencies
4. FastAPI app runs without import errors
"""

import os
import sys
from pathlib import Path


def check_directory_structure():
    """Check if resume-api/ directory exists with proper structure."""
    print("Checking directory structure...")

    required_dirs = [
        "api",
        "lib",
        "lib/cli",
        "lib/utils",
        "templates",
        "templates/base",
        "config"
    ]

    for dir_path in required_dirs:
        full_path = Path(dir_path)
        if not full_path.exists():
            print(f"  [FAIL] Missing directory: {dir_path}")
            return False
        print(f"  [OK] Found directory: {dir_path}")

    return True


def check_vendored_code():
    """Check if resume-cli code is vendored in resume-api/lib/."""
    print("\nChecking vendored resume-cli code...")

    required_files = [
        "lib/cli/__init__.py",
        "lib/cli/generator.py",
        "lib/cli/tailorer.py",
        "lib/cli/variants.py",
        "lib/utils/__init__.py",
        "lib/utils/ai.py",
        "lib/__init__.py"
    ]

    for file_path in required_files:
        full_path = Path(file_path)
        if not full_path.exists():
            print(f"  [FAIL] Missing file: {file_path}")
            return False
        print(f"  [OK] Found file: {file_path}")

    return True


def check_requirements():
    """Check if requirements.txt contains necessary dependencies."""
    print("\nChecking requirements.txt...")

    required_packages = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "PyYAML"
    ]

    requirements_path = Path("requirements.txt")
    if not requirements_path.exists():
        print("  [FAIL] requirements.txt not found")
        return False

    with open(requirements_path, "r") as f:
        content = f.read()

    for package in required_packages:
        if package.lower() not in content.lower():
            print(f"  [FAIL] Missing package: {package}")
            return False
        print(f"  [OK] Found package: {package}")

    return True


def check_imports():
    """Check if FastAPI app runs without import errors."""
    print("\nChecking FastAPI app imports...")

    try:
        # Add current directory to Python path
        sys.path.insert(0, str(Path.cwd()))

        # Import the API router
        from api import router
        print("  [OK] API router imported successfully")

        # Import models
        from api.models import ResumeRequest, TailorRequest, VariantsResponse
        print("  [OK] API models imported successfully")

        # Import library components
        from lib.cli import ResumeGenerator, ResumeTailorer, VariantManager
        print("  [OK] Library CLI components imported successfully")

        # Import main app
        import main
        print("  [OK] Main FastAPI app imported successfully")

        return True

    except Exception as e:
        print(f"  [FAIL] Import error: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_templates():
    """Check if templates exist."""
    print("\nChecking templates...")

    template_files = [
        "templates/base/main.tex",
        "templates/base/metadata.yaml"
    ]

    for file_path in template_files:
        full_path = Path(file_path)
        if not full_path.exists():
            print(f"  [FAIL] Missing template file: {file_path}")
            return False
        print(f"  [OK] Found template file: {file_path}")

    return True


def main():
    """Run all validation checks."""
    print("=" * 60)
    print("Phase 1.1 Acceptance Criteria Validation")
    print("=" * 60)

    checks = [
        check_directory_structure,
        check_vendored_code,
        check_requirements,
        check_imports,
        check_templates
    ]

    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"\n  [ERROR] Check failed with exception: {e}")
            results.append(False)

    print("\n" + "=" * 60)
    print("Validation Results")
    print("=" * 60)

    if all(results):
        print("\n[SUCCESS] All acceptance criteria met!")
        print("\n- resume-api/ directory exists with proper structure")
        print("- resume-cli code is vendored in resume-api/lib/")
        print("- requirements.txt contains necessary dependencies")
        print("- FastAPI app runs without import errors")
        print("- Templates are properly configured")
        return 0
    else:
        print("\n[FAILURE] Some acceptance criteria not met")
        print(f"\nPassed: {sum(results)}/{len(results)}")
        print(f"Failed: {len(results) - sum(results)}/{len(results)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
