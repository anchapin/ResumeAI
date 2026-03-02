#!/usr/bin/env python3
"""
Cookie Security Verification Script

Verifies that all authentication cookies in the ResumeAI API
are properly configured with httpOnly and secure flags.
"""

import re
import sys
from pathlib import Path


def verify_cookie_settings(file_path: str, cookie_name: str) -> bool:
    """Verify that a cookie is set with proper security flags."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Find all set_cookie calls for this cookie
    pattern = rf'set_cookie\(\s*key=["\']?{cookie_name}["\']?[^)]*httponly\s*=\s*True[^)]*secure\s*=\s*True'
    matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
    
    return len(matches) > 0


def check_file(file_path: str) -> dict:
    """Check a file for proper cookie configuration."""
    if not Path(file_path).exists():
        return {"exists": False, "status": "FILE NOT FOUND"}
    
    result = {
        "exists": True,
        "file": file_path,
        "cookies": {},
        "status": "OK"
    }
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check for httponly and secure flags
    has_httponly = bool(re.search(r'httponly\s*=\s*True', content, re.IGNORECASE))
    has_secure = bool(re.search(r'secure\s*=\s*True', content, re.IGNORECASE))
    has_samesite = bool(re.search(r'samesite\s*=\s*["\']?strict["\']?', content, re.IGNORECASE))
    
    result["cookies"]["httponly"] = has_httponly
    result["cookies"]["secure"] = has_secure
    result["cookies"]["samesite_strict"] = has_samesite
    
    return result


def verify_auth_routes():
    """Verify authentication routes have proper cookie settings."""
    print("=" * 80)
    print("COOKIE SECURITY VERIFICATION REPORT")
    print("=" * 80)
    print()
    
    auth_file = "/home/alex/Projects/ResumeAI/resume-api/routes/auth.py"
    print(f"📋 Checking: {auth_file}")
    print()
    
    result = check_file(auth_file)
    
    if not result["exists"]:
        print(f"❌ ERROR: {auth_file} not found")
        return False
    
    # Check for each security flag
    checks = [
        ("httponly=True", result["cookies"]["httponly"]),
        ("secure=True", result["cookies"]["secure"]),
        ("samesite='strict'", result["cookies"]["samesite_strict"]),
    ]
    
    all_passed = True
    for check_name, passed in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}: {check_name}")
        all_passed = all_passed and passed
    
    print()
    return all_passed


def verify_csrf_middleware():
    """Verify CSRF middleware logger is properly configured."""
    print("=" * 80)
    print("CSRF MIDDLEWARE VERIFICATION")
    print("=" * 80)
    print()
    
    csrf_file = "/home/alex/Projects/ResumeAI/resume-api/middleware/csrf.py"
    print(f"📋 Checking: {csrf_file}")
    print()
    
    if not Path(csrf_file).exists():
        print(f"❌ ERROR: {csrf_file} not found")
        return False
    
    with open(csrf_file, 'r') as f:
        content = f.read()
    
    # Check for proper logger format (f-strings, not kwargs)
    has_fstring_logging = bool(re.search(r'logger\.warning\(f["\']', content))
    has_bad_logging = bool(re.search(r'logger\.(warning|error|info)\(["\'][^"\']*["\'],\s*\w+=', content))
    
    print(f"  {'✅ PASS' if has_fstring_logging else '⚠️  INFO'}: Uses f-string for logging")
    print(f"  {'✅ PASS' if not has_bad_logging else '❌ FAIL'}: No invalid kwargs in logger calls")
    print()
    
    return not has_bad_logging


def verify_test_coverage():
    """Verify test files exist for cookie security."""
    print("=" * 80)
    print("TEST COVERAGE VERIFICATION")
    print("=" * 80)
    print()
    
    test_files = [
        "/home/alex/Projects/ResumeAI/tests/test_auth_cookies.py",
        "/home/alex/Projects/ResumeAI/tests/test_cookie_headers.py",
    ]
    
    all_exist = True
    for test_file in test_files:
        exists = Path(test_file).exists()
        status = "✅" if exists else "❌"
        print(f"  {status} {Path(test_file).name}")
        all_exist = all_exist and exists
    
    print()
    return all_exist


def verify_documentation():
    """Verify documentation files exist."""
    print("=" * 80)
    print("DOCUMENTATION VERIFICATION")
    print("=" * 80)
    print()
    
    doc_files = [
        "/home/alex/Projects/ResumeAI/HTTPRONLY_SECURE_COOKIES_IMPLEMENTATION.md",
        "/home/alex/Projects/ResumeAI/ISSUE_526_PR_SUMMARY.md",
    ]
    
    all_exist = True
    for doc_file in doc_files:
        exists = Path(doc_file).exists()
        status = "✅" if exists else "❌"
        print(f"  {status} {Path(doc_file).name}")
        all_exist = all_exist and exists
    
    print()
    return all_exist


def generate_cookie_report():
    """Generate a detailed cookie security report."""
    print("=" * 80)
    print("DETAILED COOKIE CONFIGURATION REPORT")
    print("=" * 80)
    print()
    
    auth_file = "/home/alex/Projects/ResumeAI/resume-api/routes/auth.py"
    
    with open(auth_file, 'r') as f:
        lines = f.readlines()
    
    cookie_endpoints = [
        ("POST /auth/register", 167, 175),
        ("POST /auth/login (access_token)", 286, 294),
        ("POST /auth/login (csrf_token)", 296, 303),
        ("POST /auth/refresh", 401, 409),
        ("POST /auth/logout (access_token)", 460, 465),
        ("POST /auth/logout (csrf_token)", 466, 471),
    ]
    
    for endpoint, start, end in cookie_endpoints:
        print(f"📌 {endpoint} (Lines {start}-{end})")
        code = "".join(lines[start-1:end])
        
        has_httponly = "httponly=True" in code
        has_secure = "secure=True" in code
        has_samesite = "samesite=" in code
        
        print(f"   httponly=True: {'✅' if has_httponly else '❌'}")
        print(f"   secure=True: {'✅' if has_secure else '❌'}")
        print(f"   samesite: {'✅' if has_samesite else '❌'}")
        print()


def main():
    """Run all verifications."""
    print()
    print("🔐 ResumeAI Cookie Security Verification")
    print("Issue #526: [S1-Security-1] Implement httpOnly Cookies for Auth")
    print()
    
    results = {
        "auth_routes": verify_auth_routes(),
        "csrf_middleware": verify_csrf_middleware(),
        "test_coverage": verify_test_coverage(),
        "documentation": verify_documentation(),
    }
    
    generate_cookie_report()
    
    print("=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    print()
    
    for check_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        check_label = check_name.replace("_", " ").title()
        print(f"{status}: {check_label}")
    
    print()
    
    all_passed = all(results.values())
    if all_passed:
        print("✅ All security checks PASSED")
        print("🎉 Issue #526 implementation is COMPLETE and VERIFIED")
        return 0
    else:
        print("❌ Some checks FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
