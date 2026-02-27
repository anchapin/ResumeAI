#!/usr/bin/env python3
"""
Standalone test for API key management module.

This test doesn't require pytest and can be run with:
    python3 test_key_management_standalone.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import bcrypt
except ImportError:
    print("ERROR: bcrypt module not found. Install with: pip install bcrypt")
    sys.exit(1)

from lib.security.key_management import (
    hash_api_key,
    verify_api_key,
    generate_api_key_prefix,
    is_hashed_key,
    migrate_plaintext_keys,
)


def test_hash_api_key():
    """Test API key hashing."""
    key = "test_api_key_12345678"
    hashed = hash_api_key(key)

    assert hashed.startswith(("$2a$", "$2b$", "$2y$")), "Hash should start with bcrypt prefix"
    assert len(hashed) > 50, "Hash should be long enough"
    print("✓ test_hash_api_key passed")


def test_verify_api_key():
    """Test API key verification."""
    key = "test_api_key_12345678"
    hashed = hash_api_key(key)

    # Correct key should verify
    assert verify_api_key(key, hashed) is True, "Correct key should verify"

    # Wrong key should not verify
    assert verify_api_key("wrong_key", hashed) is False, "Wrong key should not verify"

    # Empty key should not verify
    assert verify_api_key("", hashed) is False, "Empty key should not verify"

    print("✓ test_verify_api_key passed")


def test_generate_api_key_prefix():
    """Test API key prefix generation."""
    key = "rai_1234567890abcdef_extra_chars"
    prefix = generate_api_key_prefix(key, prefix_length=12)

    assert prefix == "rai_1234567", f"Expected 'rai_1234567' but got '{prefix}'"
    assert len(prefix) == 12, f"Expected length 12 but got {len(prefix)}"

    # Short key should return 'unknown'
    short_prefix = generate_api_key_prefix("short")
    assert short_prefix == "unknown", "Short key should return 'unknown'"

    print("✓ test_generate_api_key_prefix passed")


def test_is_hashed_key():
    """Test bcrypt hash detection."""
    key = "test_api_key_12345678"
    hashed = hash_api_key(key)

    assert is_hashed_key(hashed) is True, "Hashed key should be detected"
    assert is_hashed_key(key) is False, "Plaintext key should not be detected as hashed"
    assert is_hashed_key("") is False, "Empty string should not be detected as hashed"

    # Known bcrypt hashes
    hash_2a = "$2a$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke"
    hash_2b = "$2b$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke"
    hash_2y = "$2y$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke"

    assert is_hashed_key(hash_2a) is True, "$2a$ format should be detected"
    assert is_hashed_key(hash_2b) is True, "$2b$ format should be detected"
    assert is_hashed_key(hash_2y) is True, "$2y$ format should be detected"

    print("✓ test_is_hashed_key passed")


def test_migrate_plaintext_keys():
    """Test plaintext key migration."""
    plaintext_keys = ["key1_12345678", "key2_87654321"]
    migration_map = migrate_plaintext_keys(plaintext_keys)

    assert len(migration_map) == 2, f"Expected 2 migrated keys, got {len(migration_map)}"

    for plaintext_key, hashed_key in migration_map.items():
        assert is_hashed_key(hashed_key) is True, "Migrated key should be hashed"
        assert verify_api_key(plaintext_key, hashed_key) is True, "Migrated key should verify"

    # Empty list should raise ValueError
    try:
        migrate_plaintext_keys([])
        assert False, "Empty list should raise ValueError"
    except ValueError:
        pass

    print("✓ test_migrate_plaintext_keys passed")


def test_different_salts_different_hashes():
    """Test that same key produces different hashes due to salt."""
    key = "test_api_key_12345678"
    hash1 = hash_api_key(key)
    hash2 = hash_api_key(key)

    # Different hashes
    assert hash1 != hash2, "Different salts should produce different hashes"

    # But both should verify against the key
    assert verify_api_key(key, hash1) is True, "Hash 1 should verify"
    assert verify_api_key(key, hash2) is True, "Hash 2 should verify"

    print("✓ test_different_salts_different_hashes passed")


def test_case_sensitivity():
    """Test that key verification is case-sensitive."""
    key = "TestApiKey"
    hashed = hash_api_key(key)

    assert verify_api_key(key, hashed) is True, "Correct key should verify"
    assert verify_api_key("testapikey", hashed) is False, "Lowercase should not match"
    assert verify_api_key("TESTAPIKEY", hashed) is False, "Uppercase should not match"

    print("✓ test_case_sensitivity passed")


def test_special_characters():
    """Test hashing keys with special characters."""
    key = "rai_1234567890!@#$%^&*()_+-=[]{}|;:,.<>?"
    hashed = hash_api_key(key)

    assert hashed.startswith(("$2a$", "$2b$", "$2y$")), "Hash should be valid bcrypt"
    assert verify_api_key(key, hashed) is True, "Special char key should verify"

    print("✓ test_special_characters passed")


def test_security_properties():
    """Test that original key is not in hash."""
    original_key = "test_api_key_very_unique_12345678"
    hashed = hash_api_key(original_key)

    # Original key should not appear in hash
    assert original_key not in hashed, "Original key should not appear in hash"

    # Different keys should produce different results
    key1 = "api_key_number_1"
    key2 = "api_key_number_2"
    hash1 = hash_api_key(key1)
    hash2 = hash_api_key(key2)

    assert hash1 != hash2, "Different keys should produce different hashes"
    assert verify_api_key(key1, hash2) is False, "key1 should not verify against hash2"
    assert verify_api_key(key2, hash1) is False, "key2 should not verify against hash1"

    print("✓ test_security_properties passed")


def test_backwards_compatibility():
    """Test that plaintext keys work in migration."""
    plaintext_keys = ["rai_key1", "rai_key2", "rai_key3"]
    migration_map = migrate_plaintext_keys(plaintext_keys)

    # All keys should be present
    assert len(migration_map) == 3, "All keys should be migrated"

    # All hashes should verify against original plaintext
    for plaintext_key, hashed_key in migration_map.items():
        assert verify_api_key(plaintext_key, hashed_key) is True

    print("✓ test_backwards_compatibility passed")


def main():
    """Run all tests."""
    print("=" * 70)
    print("TESTING API KEY SECURITY MODULE")
    print("=" * 70)
    print()

    tests = [
        test_hash_api_key,
        test_verify_api_key,
        test_generate_api_key_prefix,
        test_is_hashed_key,
        test_migrate_plaintext_keys,
        test_different_salts_different_hashes,
        test_case_sensitivity,
        test_special_characters,
        test_security_properties,
        test_backwards_compatibility,
    ]

    failed = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            print(f"✗ {test.__name__} FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} ERROR: {e}")
            failed += 1

    print()
    print("=" * 70)
    if failed == 0:
        print(f"✅ ALL {len(tests)} TESTS PASSED!")
        print("=" * 70)
        return 0
    else:
        print(f"❌ {failed} TEST(S) FAILED!")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
