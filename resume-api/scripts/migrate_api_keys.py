#!/usr/bin/env python3
"""
Migrate plaintext API keys to hashed versions.

This script helps migrate existing plaintext API keys stored in
environment variables to their bcrypt hashed equivalents.

Usage:
    python scripts/migrate_api_keys.py --keys "key1,key2,key3"
    python scripts/migrate_api_keys.py --env-file .env
"""

import argparse
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.security import hash_api_key, migrate_plaintext_keys, generate_api_key_prefix


def migrate_from_env_file(env_file: str) -> dict:
    """
    Migrate API keys from a .env file.

    Reads API_KEYS and MASTER_API_KEY from the file and returns their
    hashed versions.

    Args:
        env_file: Path to .env file

    Returns:
        Dictionary with migration results
    """
    if not os.path.exists(env_file):
        raise FileNotFoundError(f"Environment file not found: {env_file}")

    migration_results = {"api_keys": {}, "master_api_key": None}

    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            if line.startswith("API_KEYS="):
                keys_str = line.replace("API_KEYS=", "").strip("\"'")
                if keys_str:
                    api_keys = [k.strip() for k in keys_str.split(",") if k.strip()]
                    try:
                        migration_map = migrate_plaintext_keys(api_keys)
                        migration_results["api_keys"] = migration_map
                    except ValueError as e:
                        print(f"Error migrating API_KEYS: {e}")

            elif line.startswith("MASTER_API_KEY="):
                master_key = line.replace("MASTER_API_KEY=", "").strip("\"'")
                if master_key:
                    try:
                        hashed = hash_api_key(master_key)
                        migration_results["master_api_key"] = hashed
                    except ValueError as e:
                        print(f"Error migrating MASTER_API_KEY: {e}")

    return migration_results


def migrate_from_csv(keys_csv: str) -> dict:
    """
    Migrate API keys from comma-separated string.

    Args:
        keys_csv: Comma-separated API keys

    Returns:
        Dictionary with migrated keys
    """
    keys = [k.strip() for k in keys_csv.split(",") if k.strip()]
    return migrate_plaintext_keys(keys)


def print_migration_results(results: dict) -> None:
    """
    Pretty print migration results.

    Args:
        results: Migration results dictionary
    """
    print("\n" + "=" * 70)
    print("API KEY MIGRATION RESULTS")
    print("=" * 70 + "\n")

    if results.get("api_keys"):
        print("API_KEYS (from comma-separated list):")
        print("-" * 70)
        hashes = []
        for plaintext_key, hashed_key in results["api_keys"].items():
            prefix = generate_api_key_prefix(plaintext_key)
            print(f"  Original key prefix: {prefix}")
            print(f"  Hashed key:          {hashed_key}\n")
            hashes.append(hashed_key)

        print("Add this to your .env file:")
        print(f'API_KEYS="{",".join(hashes)}"\n')

    if results.get("master_api_key"):
        hashed = results["master_api_key"]
        print("MASTER_API_KEY:")
        print("-" * 70)
        print(f"  Hashed key: {hashed}\n")
        print("Add this to your .env file:")
        print(f'MASTER_API_KEY="{hashed}"\n')

    print("=" * 70)
    print("SECURITY NOTES:")
    print("=" * 70)
    print("""
1. Store the hashed keys in your .env file and deployment config
2. Remove the plaintext keys from your .env file
3. Update your .env.example with a note that API keys should be hashed
4. Existing plaintext keys can still authenticate during migration period
5. For production, ensure REQUIRE_API_KEY=true is set

The authentication system now supports both hashed and plaintext keys for
backward compatibility, but new keys should always be hashed.
    """)


def main():
    """Run migration script."""
    parser = argparse.ArgumentParser(
        description="Migrate plaintext API keys to hashed versions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Migrate from comma-separated key string
  python scripts/migrate_api_keys.py --keys "rai_key1,rai_key2"

  # Migrate from .env file
  python scripts/migrate_api_keys.py --env-file .env

  # Migrate from .env.production
  python scripts/migrate_api_keys.py --env-file .env.production
        """,
    )

    parser.add_argument(
        "--keys",
        help="Comma-separated API keys to migrate",
    )
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Path to .env file to migrate (default: .env)",
    )

    args = parser.parse_args()

    try:
        if args.keys:
            results = migrate_from_csv(args.keys)
        elif args.env_file:
            results = migrate_from_env_file(args.env_file)
        else:
            parser.print_help()
            sys.exit(1)

        print_migration_results(results)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
