#!/usr/bin/env python3
"""
Test script to verify health check functionality
"""

import httpx
import sys
import time


def test_health_check():
    """Test the health check endpoint"""
    try:
        response = httpx.get("http://localhost:8000/health", timeout=10)
        response.raise_for_status()

        # Check if the response contains the expected status
        data = response.json()
        if data.get("status") == "healthy":
            print("✓ Health check passed: status is healthy")
            return True
        else:
            print(f"✗ Health check failed: unexpected status {data.get('status')}")
            return False

    except Exception as e:
        print(f"✗ Health check failed with error: {e}")
        return False


def simulate_health_check_logic():
    """Simulate the exact logic used in the health check command"""
    try:
        import httpx

        r = httpx.get("http://localhost:8000/health", timeout=10)
        r.raise_for_status()
        exit_code = 0 if r.json().get("status") == "healthy" else 1

        if exit_code == 0:
            print("✓ Health check logic passed: would exit with code 0")
        else:
            print("✗ Health check logic failed: would exit with code 1")

        return exit_code == 0

    except Exception as e:
        print(f"✗ Health check logic failed with error: {e}")
        return False


if __name__ == "__main__":
    print("Testing health check functionality...")

    # Note: This test assumes the service is running on localhost:8000
    # If the service isn't running, this will fail as expected

    success = test_health_check()
    if success:
        simulate_health_check_logic()

    sys.exit(0 if success else 1)
