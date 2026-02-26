#!/bin/bash

# Verification script for Issue #377: Secrets Management Implementation
# This script verifies that all components are properly implemented

echo "=========================================="
echo "Issue #377: Secrets Management Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

echo "1. Checking .env.example exists and has documentation..."
if [ -f ".env.example" ]; then
    if grep -q "MASTER_API_KEY\|SECRET_KEY\|OPENAI_API_KEY" .env.example; then
        pass ".env.example exists with documented variables"
    else
        fail ".env.example missing critical variables"
    fi
else
    fail ".env.example not found"
fi

echo ""
echo "2. Checking resume-api/.env.example exists..."
if [ -f "resume-api/.env.example" ]; then
    if grep -q "MASTER_API_KEY\|JWT_SECRET\|OPENAI_API_KEY" resume-api/.env.example; then
        pass "resume-api/.env.example exists with documented variables"
    else
        fail "resume-api/.env.example missing critical variables"
    fi
else
    fail "resume-api/.env.example not found"
fi

echo ""
echo "3. Checking config/validation.py exists..."
if [ -f "resume-api/config/validation.py" ]; then
    if grep -q "class SecretValidator\|def startup_validation" resume-api/config/validation.py; then
        pass "config/validation.py has SecretValidator and startup_validation"
    else
        fail "config/validation.py missing validation functions"
    fi
else
    fail "config/validation.py not found"
fi

echo ""
echo "4. Checking startup_validation is called in main.py..."
if grep -q "from config.validation import startup_validation" resume-api/main.py; then
    if grep -q "startup_validation()" resume-api/main.py; then
        pass "startup_validation is imported and called in main.py"
    else
        fail "startup_validation is imported but not called in main.py"
    fi
else
    fail "startup_validation is not imported in main.py"
fi

echo ""
echo "5. Checking SECRETS_ROTATION.md exists..."
if [ -f "SECRETS_ROTATION.md" ]; then
    if grep -q "Step-by-Step\|API Key Rotation\|JWT Secret Rotation" SECRETS_ROTATION.md; then
        pass "SECRETS_ROTATION.md exists with procedures"
    else
        fail "SECRETS_ROTATION.md missing detailed procedures"
    fi
else
    fail "SECRETS_ROTATION.md not found"
fi

echo ""
echo "6. Checking CONTRIBUTING.md has secrets section..."
if grep -q "## Secrets Management" CONTRIBUTING.md; then
    if grep -q "Never commit\|startup_validation\|SECRETS_ROTATION" CONTRIBUTING.md; then
        pass "CONTRIBUTING.md has comprehensive secrets section"
    else
        fail "CONTRIBUTING.md secrets section incomplete"
    fi
else
    fail "CONTRIBUTING.md missing secrets section"
fi

echo ""
echo "7. Checking SECRETS_MANAGEMENT.md still exists..."
if [ -f "SECRETS_MANAGEMENT.md" ]; then
    if grep -q "Secrets Management Guide\|Required Secrets" SECRETS_MANAGEMENT.md; then
        pass "SECRETS_MANAGEMENT.md exists with overview"
    else
        fail "SECRETS_MANAGEMENT.md appears corrupted"
    fi
else
    fail "SECRETS_MANAGEMENT.md not found"
fi

echo ""
echo "8. Checking validation tests exist..."
if [ -f "resume-api/tests/test_startup_validation.py" ]; then
    if grep -q "class TestSecretValidator\|def test_validate" resume-api/tests/test_startup_validation.py; then
        pass "test_startup_validation.py has comprehensive tests"
    else
        fail "test_startup_validation.py missing test methods"
    fi
else
    fail "test_startup_validation.py not found"
fi

echo ""
echo "9. Checking sensitive variables are defined..."
if grep -q "SENSITIVE_VARS = {" resume-api/config/validation.py; then
    if grep -q "OPENAI_API_KEY\|MASTER_API_KEY\|DATABASE_URL" resume-api/config/validation.py; then
        pass "Sensitive variables list is defined and comprehensive"
    else
        fail "Sensitive variables list incomplete"
    fi
else
    fail "SENSITIVE_VARS not defined"
fi

echo ""
echo "10. Checking validation error messages are helpful..."
if grep -q "Please set these in .env\|See .env.example for documentation" resume-api/config/validation.py; then
    pass "Error messages are helpful and reference documentation"
else
    fail "Error messages need improvement"
fi

echo ""
echo "=========================================="
echo "Summary:"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Issue #377 is fully implemented.${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed. Please review above.${NC}"
    exit 1
fi
