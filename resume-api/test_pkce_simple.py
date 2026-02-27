#!/usr/bin/env python3
"""
Simple PKCE tests without pytest dependency.
Tests the core PKCE functions from routes/github.py
"""

from routes.github import (
    generate_pkce_code_verifier,
    generate_pkce_code_challenge,
    verify_pkce_challenge,
)


def test_code_verifier_generation():
    """Test PKCE code verifier generation."""
    print("Testing code verifier generation...")

    verifier = generate_pkce_code_verifier()

    # Check length
    assert len(verifier) == 128, f"Verifier length should be 128, got {len(verifier)}"

    # Check valid characters (RFC 7636: unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~")
    valid_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~')
    for char in verifier:
        assert char in valid_chars, f"Invalid character in verifier: {char}"

    print(f"  ✓ Generated 128-character verifier with valid characters")
    return verifier


def test_code_challenge_generation(verifier):
    """Test PKCE code challenge generation."""
    print("Testing code challenge generation...")

    challenge = generate_pkce_code_challenge(verifier)

    # Check no padding characters
    assert '+' not in challenge, "Challenge should not contain +"
    assert '/' not in challenge, "Challenge should not contain /"
    assert '=' not in challenge, "Challenge should not contain padding ="

    # Check base64url alphabet
    valid_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_')
    for char in challenge:
        assert char in valid_chars, f"Invalid character in challenge: {char}"

    print(f"  ✓ Generated base64url-encoded SHA256 challenge: {challenge[:50]}...")
    return challenge


def test_challenge_determinism(verifier):
    """Test that same verifier produces same challenge."""
    print("Testing challenge determinism...")

    challenge1 = generate_pkce_code_challenge(verifier)
    challenge2 = generate_pkce_code_challenge(verifier)

    assert challenge1 == challenge2, "Same verifier should produce same challenge"

    print(f"  ✓ Same verifier produces identical challenge")


def test_pkce_verification(verifier, challenge):
    """Test PKCE challenge verification."""
    print("Testing PKCE verification...")

    # Valid verification
    result = verify_pkce_challenge(verifier, challenge)
    assert result is True, f"Valid verifier should verify against challenge"
    print(f"  ✓ Valid verifier verifies successfully")

    # Invalid verification
    wrong_verifier = verifier + "_modified"
    result = verify_pkce_challenge(wrong_verifier, challenge)
    assert result is False, f"Invalid verifier should not verify"
    print(f"  ✓ Invalid verifier fails verification")


def test_multiple_flows():
    """Test multiple independent OAuth flows."""
    print("Testing multiple independent flows...")

    flows = []
    for i in range(5):
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)
        flows.append((verifier, challenge))

    # All verifiers should be unique
    verifiers = [v for v, _ in flows]
    assert len(set(verifiers)) == len(verifiers), "All verifiers should be unique"

    # All challenges should be unique
    challenges = [c for _, c in flows]
    assert len(set(challenges)) == len(challenges), "All challenges should be unique"

    # Cross-verification should fail
    for i, (verifier1, challenge1) in enumerate(flows):
        for j, (verifier2, challenge2) in enumerate(flows):
            if i != j:
                result = verify_pkce_challenge(verifier1, challenge2)
                assert result is False, f"Verifier {i} should not verify challenge {j}"

    print(f"  ✓ Generated 5 unique flows with proper isolation")


def test_attack_scenario():
    """
    Test that PKCE prevents code interception attack.

    Scenario:
    - Alice initiates OAuth with challenge_A
    - Attacker intercepts auth code
    - Attacker tries to use code with verifier_B
    - Verification should fail because verifier_B doesn't match challenge_A
    """
    print("Testing code interception attack prevention...")

    # Alice's legitimate flow
    alice_verifier = generate_pkce_code_verifier()
    alice_challenge = generate_pkce_code_challenge(alice_verifier)

    # Attacker's attempt with different verifier
    attacker_verifier = generate_pkce_code_verifier()

    # Verification should fail
    result = verify_pkce_challenge(attacker_verifier, alice_challenge)
    assert result is False, "Attacker's verifier should not verify Alice's challenge"

    print(f"  ✓ Code interception attack prevented (attacker verifier rejected)")


def main():
    """Run all PKCE tests."""
    print("\n" + "="*70)
    print("OAuth 2.0 PKCE Implementation Tests")
    print("="*70 + "\n")

    try:
        # Generate test data
        verifier = test_code_verifier_generation()
        challenge = test_code_challenge_generation(verifier)

        # Test properties
        test_challenge_determinism(verifier)
        test_pkce_verification(verifier, challenge)

        # Test scenarios
        test_multiple_flows()
        test_attack_scenario()

        print("\n" + "="*70)
        print("✓ All PKCE tests passed!")
        print("="*70 + "\n")
        return True
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}\n")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}\n")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
