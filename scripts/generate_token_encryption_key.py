#!/usr/bin/env python3
"""
Generate a token encryption key for OAuth token storage at rest.

Usage:
    python scripts/generate_token_encryption_key.py

Output:
    A URL-safe base64-encoded encryption key suitable for use with
    the TokenEncryption utility.

Security Note:
    - Store the generated key securely
    - Do not commit the key to version control
    - Use different keys for development, staging, and production
"""

import sys
import os

# Add resume-api to path to import lib modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'resume-api'))

from lib.token_encryption import generate_encryption_key


def main():
    """Generate and display a new token encryption key."""
    key = generate_encryption_key()

    print("=" * 70)
    print("TOKEN ENCRYPTION KEY GENERATED")
    print("=" * 70)
    print()
    print(f"TOKEN_ENCRYPTION_KEY={key}")
    print()
    print("Add this to your .env file or environment configuration:")
    print("  - For development: Add to resume-api/.env")
    print("  - For production: Add to your secret management system")
    print()
    print("=" * 70)
    print("IMPORTANT SECURITY REMINDERS")
    print("=" * 70)
    print("- Store this key securely")
    print("- Do NOT commit this key to version control")
    print("- Use different keys for different environments")
    print("- Rotate keys regularly (recommended: every 90 days)")
    print("- See TOKEN_ENCRYPTION_KEY_ROTATION.md for rotation procedures")
    print("=" * 70)


if __name__ == "__main__":
    main()
