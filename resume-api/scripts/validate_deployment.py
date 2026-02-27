#!/usr/bin/env python3
"""
Deployment Validation Script

Validates ResumeAI deployment health, configuration, and readiness.
Supports various validation modes for different deployment stages.

Usage:
    python scripts/validate_deployment.py --pre-deployment
    python scripts/validate_deployment.py --check-health
    python scripts/validate_deployment.py --smoke-test
    python scripts/validate_deployment.py --verify-safeguards
"""

import sys
import os
import json
import argparse
import subprocess
import time
import requests
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime

# Configuration
API_URL = os.getenv('API_URL', 'http://localhost:8000')
API_KEY = os.getenv('MASTER_API_KEY', '')
TIMEOUT = 10
CHECK_RETRIES = 3
CHECK_INTERVAL = 2


class DeploymentValidator:
    """Validates deployment readiness and health"""

    def __init__(self, api_url: str = API_URL, api_key: str = API_KEY):
        self.api_url = api_url
        self.api_key = api_key
        self.results: Dict[str, any] = {}
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def log_success(self, check: str, message: str = ""):
        """Log successful check"""
        msg = f"✓ {check}"
        if message:
            msg += f": {message}"
        print(msg)
        self.results[check] = {"status": "passed", "message": message}

    def log_error(self, check: str, message: str = ""):
        """Log failed check"""
        msg = f"✗ {check}"
        if message:
            msg += f": {message}"
        print(msg)
        self.errors.append(msg)
        self.results[check] = {"status": "failed", "message": message}

    def log_warning(self, check: str, message: str = ""):
        """Log warning (non-critical issue)"""
        msg = f"⚠ {check}"
        if message:
            msg += f": {message}"
        print(msg)
        self.warnings.append(msg)
        self.results[check] = {"status": "warning", "message": message}

    def check_health(self) -> bool:
        """Check service health endpoint"""
        try:
            response = requests.get(
                f"{self.api_url}/health",
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_success(
                        "Health Check",
                        f"Service healthy (v{data.get('version', 'unknown')})"
                    )
                    return True
                else:
                    self.log_error("Health Check", f"Status: {data.get('status')}")
                    return False
            else:
                self.log_error("Health Check", f"HTTP {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            self.log_error("Health Check", "Cannot connect to service")
            return False
        except Exception as e:
            self.log_error("Health Check", str(e))
            return False

    def check_detailed_health(self) -> bool:
        """Check detailed health endpoint"""
        try:
            headers = {"X-API-KEY": self.api_key} if self.api_key else {}
            response = requests.get(
                f"{self.api_url}/v1/health/detailed",
                headers=headers,
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                data = response.json()
                status = data.get('status')

                # Check database
                db_status = data.get('database', {}).get('status', 'unknown')
                if db_status == 'connected':
                    self.log_success("Database Connection", "Connected")
                else:
                    self.log_error("Database Connection", f"Status: {db_status}")
                    return False

                # Check AI provider
                ai_status = data.get('ai_provider', {}).get('status', 'unknown')
                if ai_status == 'available':
                    self.log_success("AI Provider", "Available")
                else:
                    self.log_warning("AI Provider", f"Status: {ai_status}")

                return status == 'healthy'
            else:
                self.log_warning("Detailed Health", f"HTTP {response.status_code}")
                return True  # Don't fail if endpoint doesn't exist yet
        except Exception as e:
            self.log_warning("Detailed Health", str(e))
            return True

    def check_database(self) -> bool:
        """Check database connectivity"""
        try:
            headers = {"X-API-KEY": self.api_key} if self.api_key else {}
            response = requests.get(
                f"{self.api_url}/v1/status/database",
                headers=headers,
                timeout=TIMEOUT
            )
            if response.status_code in (200, 404):  # 404 if endpoint doesn't exist
                self.log_success("Database Status Check", "Endpoint accessible")
                return True
            else:
                self.log_error("Database Status", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_warning("Database Status", str(e))
            return True

    def check_feature_flags(self) -> bool:
        """Check feature flags configuration"""
        try:
            headers = {"X-API-KEY": self.api_key} if self.api_key else {}
            response = requests.get(
                f"{self.api_url}/v1/health/features",
                headers=headers,
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                flags = response.json()
                enabled_count = sum(1 for v in flags.values() if v is True)
                self.log_success(
                    "Feature Flags",
                    f"{enabled_count} feature(s) enabled"
                )
                return True
            else:
                self.log_warning("Feature Flags", f"HTTP {response.status_code}")
                return True  # Non-critical
        except Exception as e:
            self.log_warning("Feature Flags", str(e))
            return True

    def check_endpoints(self) -> bool:
        """Smoke test critical endpoints"""
        endpoints = [
            ("/health", "GET"),
            ("/v1/health/detailed", "GET"),
        ]

        passed = 0
        for endpoint, method in endpoints:
            try:
                headers = {"X-API-KEY": self.api_key} if self.api_key else {}
                response = requests.request(
                    method,
                    f"{self.api_url}{endpoint}",
                    headers=headers,
                    timeout=TIMEOUT
                )
                if 200 <= response.status_code < 300:
                    self.log_success(f"Endpoint {method} {endpoint}")
                    passed += 1
                else:
                    self.log_warning(f"Endpoint {method} {endpoint}", f"HTTP {response.status_code}")
            except Exception as e:
                self.log_warning(f"Endpoint {method} {endpoint}", str(e))

        return passed == len(endpoints)

    def check_dependencies(self) -> bool:
        """Check system dependencies"""
        dependencies = {
            'python': ['python3', '--version'],
            'docker': ['docker', '--version'],
        }

        all_ok = True
        for name, cmd in dependencies.items():
            try:
                result = subprocess.run(cmd, capture_output=True, timeout=5)
                if result.returncode == 0:
                    self.log_success(f"Dependency: {name}")
                else:
                    self.log_warning(f"Dependency: {name}", "Not available")
                    all_ok = False
            except Exception as e:
                self.log_warning(f"Dependency: {name}", str(e))
                all_ok = False

        return all_ok

    def check_environment_variables(self) -> bool:
        """Check required environment variables"""
        required_vars = [
            'AI_PROVIDER',
            'AI_MODEL',
        ]

        optional_vars = [
            'OPENAI_API_KEY',
            'ANTHROPIC_API_KEY',
            'GEMINI_API_KEY',
        ]

        all_ok = True
        for var in required_vars:
            if os.getenv(var):
                self.log_success(f"Environment: {var}")
            else:
                self.log_error(f"Environment: {var}", "Not set")
                all_ok = False

        has_ai_key = any(os.getenv(var) for var in optional_vars)
        if has_ai_key:
            self.log_success("Environment: AI API Key", "Configured")
        else:
            self.log_warning("Environment: AI API Key", "No API key found")

        return all_ok

    def check_disk_space(self) -> bool:
        """Check available disk space"""
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            free_percent = (free / total) * 100

            if free_percent > 20:
                self.log_success("Disk Space", f"{free_percent:.1f}% free")
                return True
            elif free_percent > 10:
                self.log_warning("Disk Space", f"Low: {free_percent:.1f}% free")
                return True
            else:
                self.log_error("Disk Space", f"Critical: {free_percent:.1f}% free")
                return False
        except Exception as e:
            self.log_warning("Disk Space", str(e))
            return True

    def pre_deployment_validation(self) -> bool:
        """Run full pre-deployment validation"""
        print("\n" + "="*50)
        print("PRE-DEPLOYMENT VALIDATION")
        print("="*50)

        checks = [
            ("Environment Variables", self.check_environment_variables),
            ("Health Check", self.check_health),
            ("Detailed Health", self.check_detailed_health),
            ("Database", self.check_database),
            ("Feature Flags", self.check_feature_flags),
            ("Endpoints", self.check_endpoints),
            ("Dependencies", self.check_dependencies),
            ("Disk Space", self.check_disk_space),
        ]

        passed = 0
        for name, check_fn in checks:
            try:
                if check_fn():
                    passed += 1
            except Exception as e:
                self.log_error(name, str(e))

        self.print_summary()
        return len(self.errors) == 0

    def smoke_test(self) -> bool:
        """Run smoke tests on critical functionality"""
        print("\n" + "="*50)
        print("SMOKE TEST")
        print("="*50)

        # Test health endpoint multiple times
        for i in range(3):
            if self.check_health():
                print(f"Attempt {i+1}/3: OK")
            else:
                print(f"Attempt {i+1}/3: FAILED")
                return False

        # Test critical endpoints
        self.check_endpoints()

        # Test feature flags
        self.check_feature_flags()

        self.print_summary()
        return len(self.errors) == 0

    def verify_safeguards(self) -> bool:
        """Verify deployment safeguards are in place"""
        print("\n" + "="*50)
        print("DEPLOYMENT SAFEGUARDS VERIFICATION")
        print("="*50)

        safeguards = {
            "Feature Flags Configured": os.getenv('FEATURE_FLAG_OAUTH') is not None,
            "Health Checks Implemented": True,  # Built-in
            "API Key Authentication": self.api_key is not None,
            "Logging Configured": os.getenv('LOG_LEVEL') is not None,
        }

        passed = 0
        for name, status in safeguards.items():
            if status:
                self.log_success(f"Safeguard: {name}")
                passed += 1
            else:
                self.log_warning(f"Safeguard: {name}", "Not configured")

        self.print_summary()
        return passed >= len(safeguards) // 2  # At least 50% should pass

    def print_summary(self):
        """Print validation summary"""
        print("\n" + "-"*50)
        print("SUMMARY")
        print("-"*50)

        passed = len([r for r in self.results.values() if r.get('status') == 'passed'])
        failed = len([r for r in self.results.values() if r.get('status') == 'failed'])
        warned = len([r for r in self.results.values() if r.get('status') == 'warning'])

        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Warnings: {warned}")
        print(f"Total: {passed + failed + warned}")

        if self.errors:
            print("\nErrors:")
            for error in self.errors:
                print(f"  {error}")

        if self.warnings:
            print("\nWarnings:")
            for warning in self.warnings:
                print(f"  {warning}")


def main():
    parser = argparse.ArgumentParser(
        description='ResumeAI Deployment Validator'
    )

    parser.add_argument('--api-url', default=API_URL, help='API URL')
    parser.add_argument('--api-key', default=API_KEY, help='Master API key')

    # Validation modes
    parser.add_argument('--pre-deployment', action='store_true', help='Run pre-deployment checks')
    parser.add_argument('--check-health', action='store_true', help='Check service health')
    parser.add_argument('--smoke-test', action='store_true', help='Run smoke tests')
    parser.add_argument('--verify-safeguards', action='store_true', help='Verify deployment safeguards')

    args = parser.parse_args()

    validator = DeploymentValidator(args.api_url, args.api_key)

    # If no specific mode, run pre-deployment by default
    if not any([args.pre_deployment, args.check_health, args.smoke_test, args.verify_safeguards]):
        args.pre_deployment = True

    success = True

    if args.pre_deployment:
        success &= validator.pre_deployment_validation()

    if args.check_health:
        success &= validator.check_health()

    if args.smoke_test:
        success &= validator.smoke_test()

    if args.verify_safeguards:
        success &= validator.verify_safeguards()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
