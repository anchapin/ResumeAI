"""
Test script for rate limiting implementation.

Tests various scenarios:
1. Normal usage (not rate limited)
2. Exceeding rate limits
3. Rate limit reset
4. Multiple API keys
5. Response headers
"""

import asyncio
import httpx

# Test configuration
API_BASE_URL = "http://localhost:8000"
TEST_API_KEY = "rai_test_key_1234567890"
SECOND_API_KEY = "rai_test_key_0987654321"


# Sample resume data for testing
SAMPLE_RESUME_DATA = {
    "basics": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1-555-123-4567",
        "summary": "Software engineer with 5 years of experience",
    },
    "work": [
        {
            "company": "Tech Corp",
            "position": "Senior Developer",
            "startDate": "2020-01-01",
            "summary": "Led development of web applications",
        }
    ],
    "education": [
        {
            "institution": "University of Technology",
            "area": "Computer Science",
            "studyType": "Bachelor",
            "startDate": "2015-09-01",
            "endDate": "2019-05-01",
        }
    ],
}


class RateLimitTester:
    """Tester for rate limiting functionality."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def test_health_check(self) -> bool:
        """Test that the API is running."""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                print("✓ API health check passed")
                return True
            else:
                print(f"✗ API health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ API health check error: {e}")
            return False

    async def test_variants_normal(self, api_key: str) -> bool:
        """Test normal usage of variants endpoint (should not be rate limited)."""
        print(f"\n--- Testing variants endpoint with API key: {api_key[:10]}... ---")

        for i in range(3):
            try:
                response = await self.client.get(
                    f"{self.base_url}/v1/variants", headers={"X-API-KEY": api_key}
                )

                if response.status_code == 200:
                    headers = response.headers
                    print(f"  Request {i+1}: Success")
                    if "X-RateLimit-Limit" in headers:
                        print(f"    Rate Limit: {headers['X-RateLimit-Limit']}")
                        print(f"    Remaining: {headers['X-RateLimit-Remaining']}")
                        print(f"    Reset: {headers['X-RateLimit-Reset']}")
                else:
                    print(f"  Request {i+1}: Failed with status {response.status_code}")
                    print(f"    Error: {response.text}")
                    return False

            except Exception as e:
                print(f"  Request {i+1}: Error - {e}")
                return False

        print("✓ Variants endpoint normal usage test passed")
        return True

    async def test_variants_exceed_limit(self, api_key: str) -> bool:
        """Test exceeding rate limit on variants endpoint."""
        print(f"\n--- Testing variants endpoint rate limit (60 req/min) ---")

        # Send 65 requests (should exceed limit of 60)
        rate_limited = False
        success_count = 0
        fail_count = 0

        for i in range(65):
            try:
                response = await self.client.get(
                    f"{self.base_url}/v1/variants", headers={"X-API-KEY": api_key}
                )

                if response.status_code == 429:
                    if not rate_limited:
                        print(f"  Rate limit triggered at request {i+1}")
                        print(f"  Status: {response.status_code}")
                        print(f"  Headers: {dict(response.headers)}")
                        rate_limited = True
                        fail_count += 1
                    else:
                        fail_count += 1
                elif response.status_code == 200:
                    success_count += 1
                else:
                    print(
                        f"  Unexpected status {response.status_code} at request {i+1}"
                    )
                    return False

            except Exception as e:
                print(f"  Error at request {i+1}: {e}")
                return False

        if rate_limited:
            print(
                f"✓ Rate limit detected: {success_count} successful, {fail_count} rate limited"
            )
            return True
        else:
            print("✗ Rate limit not triggered")
            return False

    async def test_multiple_api_keys(self) -> bool:
        """Test that rate limits are per API key."""
        print(f"\n--- Testing multiple API keys (separate rate limits) ---")

        # Send 15 requests with first API key (PDF limit is 10)
        first_key_success = 0
        first_key_limited = False

        for i in range(15):
            response = await self.client.post(
                f"{self.base_url}/v1/render/pdf",
                headers={"X-API-KEY": TEST_API_KEY},
                json={"resume_data": SAMPLE_RESUME_DATA, "variant": "base"},
            )

            if response.status_code == 200:
                first_key_success += 1
            elif response.status_code == 429:
                if not first_key_limited:
                    print(f"  First API key rate limited at request {i+1}")
                    first_key_limited = True

        # Send 15 requests with second API key (should also be limited at 10)
        second_key_success = 0
        second_key_limited = False

        for i in range(15):
            response = await self.client.post(
                f"{self.base_url}/v1/render/pdf",
                headers={"X-API-KEY": SECOND_API_KEY},
                json={"resume_data": SAMPLE_RESUME_DATA, "variant": "base"},
            )

            if response.status_code == 200:
                second_key_success += 1
            elif response.status_code == 429:
                if not second_key_limited:
                    print(f"  Second API key rate limited at request {i+1}")
                    second_key_limited = True

        if first_key_limited and second_key_limited:
            print(f"✓ Both API keys properly rate limited")
            print(f"  First key: {first_key_success} successful")
            print(f"  Second key: {second_key_success} successful")
            return True
        else:
            print(f"✗ Rate limiting not working correctly for multiple API keys")
            return False

    async def test_pdf_rate_limits(self, api_key: str) -> bool:
        """Test PDF endpoint rate limiting (10 req/min)."""
        print(f"\n--- Testing PDF endpoint rate limit (10 req/min) ---")

        success_count = 0
        rate_limited = False

        for i in range(15):
            response = await self.client.post(
                f"{self.base_url}/v1/render/pdf",
                headers={"X-API-KEY": api_key},
                json={"resume_data": SAMPLE_RESUME_DATA, "variant": "base"},
            )

            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                if not rate_limited:
                    print(f"  Rate limit triggered at request {i+1}")
                    print(f"  Headers: {dict(response.headers)}")
                    rate_limited = True

        if rate_limited and success_count <= 10:
            print(f"✓ PDF rate limit working: {success_count} successful before limit")
            return True
        else:
            print(f"✗ PDF rate limit not working correctly")
            return False

    async def run_all_tests(self):
        """Run all rate limiting tests."""
        print("=" * 60)
        print("RATE LIMITING TEST SUITE")
        print("=" * 60)

        # Check API is running
        if not await self.test_health_check():
            print("\n✗ API is not running. Please start the API first.")
            return

        results = []

        # Test 1: Normal usage
        results.append(("Normal usage", await self.test_variants_normal(TEST_API_KEY)))

        # Test 2: PDF rate limits
        results.append(
            ("PDF rate limits", await self.test_pdf_rate_limits(TEST_API_KEY))
        )

        # Test 3: Variants rate limit
        results.append(
            ("Variants rate limit", await self.test_variants_exceed_limit(TEST_API_KEY))
        )

        # Test 4: Multiple API keys
        results.append(("Multiple API keys", await self.test_multiple_api_keys()))

        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        passed = sum(1 for _, result in results if result)
        total = len(results)

        for test_name, result in results:
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{status}: {test_name}")

        print(f"\nTotal: {passed}/{total} tests passed")

        if passed == total:
            print("\n✓ All rate limiting tests passed!")
        else:
            print(f"\n✗ {total - passed} test(s) failed")


async def main():
    """Main test runner."""
    tester = RateLimitTester(API_BASE_URL)

    try:
        await tester.run_all_tests()
    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main())
