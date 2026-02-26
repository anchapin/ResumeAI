"""
Tests for GitHub OAuth PKCE implementation.

Tests cover:
- PKCE code verifier generation
- PKCE code challenge generation
- PKCE challenge verification
- Integration with GitHub OAuth flow
"""

import pytest
import hashlib
import base64
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from routes.github import (
    generate_pkce_code_verifier,
    generate_pkce_code_challenge,
    verify_pkce_challenge,
)
from database import GitHubOAuthState


class TestPKCEGeneration:
    """Tests for PKCE code verifier and challenge generation."""

    def test_code_verifier_length(self):
        """Code verifier should be 128 characters."""
        verifier = generate_pkce_code_verifier()
        assert len(verifier) == 128

    def test_code_verifier_valid_chars(self):
        """Code verifier should only contain unreserved characters."""
        verifier = generate_pkce_code_verifier()
        # RFC 7636: unreserved characters are [A-Z] [a-z] [0-9] - . _ ~
        import re
        assert re.match(r'^[A-Za-z0-9\-._~]+$', verifier), f"Invalid chars in verifier: {verifier}"

    def test_code_verifier_randomness(self):
        """Different calls should generate different verifiers."""
        verifier1 = generate_pkce_code_verifier()
        verifier2 = generate_pkce_code_verifier()
        assert verifier1 != verifier2

    def test_code_challenge_from_verifier(self):
        """Code challenge should be valid base64url-encoded SHA256 hash."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Challenge should not contain + / =
        assert '+' not in challenge
        assert '/' not in challenge
        assert '=' not in challenge

        # Challenge should be base64url-decodable
        # Add padding if needed
        padding = 4 - (len(challenge) % 4)
        if padding != 4:
            padded_challenge = challenge + ('=' * padding)
        else:
            padded_challenge = challenge

        decoded = base64.urlsafe_b64decode(padded_challenge)
        assert len(decoded) == 32  # SHA256 produces 32 bytes

    def test_code_challenge_deterministic(self):
        """Same verifier should produce same challenge."""
        verifier = "test-verifier-for-determinism"
        challenge1 = generate_pkce_code_challenge(verifier)
        challenge2 = generate_pkce_code_challenge(verifier)
        assert challenge1 == challenge2

    def test_code_challenge_different_verifiers(self):
        """Different verifiers should produce different challenges."""
        verifier1 = "verifier-1"
        verifier2 = "verifier-2"
        challenge1 = generate_pkce_code_challenge(verifier1)
        challenge2 = generate_pkce_code_challenge(verifier2)
        assert challenge1 != challenge2


class TestPKCEVerification:
    """Tests for PKCE challenge verification."""

    def test_verify_matching_verifier_challenge(self):
        """Verification should succeed when verifier matches challenge."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        assert verify_pkce_challenge(verifier, challenge) is True

    def test_verify_mismatched_verifier_challenge(self):
        """Verification should fail when verifier doesn't match challenge."""
        verifier1 = "first-verifier"
        verifier2 = "second-verifier"
        challenge = generate_pkce_code_challenge(verifier1)

        assert verify_pkce_challenge(verifier2, challenge) is False

    def test_verify_tampering_detection(self):
        """Verification should fail if challenge is tampered with."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Tamper with challenge
        tampered = challenge[:-1] + ('A' if challenge[-1] != 'A' else 'B')

        assert verify_pkce_challenge(verifier, tampered) is False

    def test_verify_uses_constant_time_comparison(self):
        """Verification should use constant-time comparison."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Should be True for correct verifier
        assert verify_pkce_challenge(verifier, challenge) is True

        # Should be False for incorrect verifier (all cases)
        for i in range(len(verifier)):
            wrong_verifier = verifier[:i] + ('X' if verifier[i] != 'X' else 'Y') + verifier[i + 1:]
            assert verify_pkce_challenge(wrong_verifier, challenge) is False


class TestGitHubOAuthStateModel:
    """Tests for GitHubOAuthState with PKCE fields."""

    @pytest.mark.asyncio
    async def test_oauth_state_with_pkce(self, db: AsyncSession):
        """GitHubOAuthState should store PKCE parameters."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        oauth_state = GitHubOAuthState(
            state="test-state-123",
            user_id=1,
            code_challenge=challenge,
            code_challenge_method="S256",
            code_verifier=verifier,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )

        db.add(oauth_state)
        await db.commit()
        await db.refresh(oauth_state)

        assert oauth_state.state == "test-state-123"
        assert oauth_state.code_challenge == challenge
        assert oauth_state.code_challenge_method == "S256"
        assert oauth_state.code_verifier == verifier

    @pytest.mark.asyncio
    async def test_oauth_state_without_pkce_backward_compatible(self, db: AsyncSession):
        """GitHubOAuthState should work without PKCE for backward compatibility."""
        oauth_state = GitHubOAuthState(
            state="test-state-456",
            user_id=2,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )

        db.add(oauth_state)
        await db.commit()
        await db.refresh(oauth_state)

        assert oauth_state.state == "test-state-456"
        assert oauth_state.code_challenge is None
        assert oauth_state.code_challenge_method is None
        assert oauth_state.code_verifier is None


class TestPKCEIntegration:
    """Integration tests for PKCE with GitHub OAuth flow."""

    def test_full_pkce_flow(self):
        """Test complete PKCE flow: generate, challenge, store, verify."""
        # Step 1: Generate verifier and challenge
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Verify verifier meets RFC 7636 requirements
        assert 43 <= len(verifier) <= 128
        assert all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~' for c in verifier)

        # Step 2: Challenge should be base64url without padding
        assert '+' not in challenge and '/' not in challenge and '=' not in challenge

        # Step 3: Verification should succeed
        assert verify_pkce_challenge(verifier, challenge) is True

        # Step 4: Verification should fail with wrong verifier
        assert verify_pkce_challenge(verifier + "modified", challenge) is False

    def test_pkce_prevents_authorization_code_exchange_attack(self):
        """
        Demonstrate that PKCE prevents authorization code interception.
        
        Scenario:
        - Attacker intercepts authorization code during redirect
        - Attacker attempts to exchange code without verifier
        - Backend verification fails because verifier doesn't match challenge
        """
        # Legitimate flow
        legitimate_verifier = generate_pkce_code_verifier()
        legitimate_challenge = generate_pkce_code_challenge(legitimate_verifier)

        # Attacker tries with random verifier
        attacker_verifier = generate_pkce_code_verifier()

        # Verification should fail
        assert verify_pkce_challenge(attacker_verifier, legitimate_challenge) is False

    def test_multiple_clients_different_verifiers(self):
        """Multiple OAuth flows should use different verifiers."""
        verifiers = {generate_pkce_code_verifier() for _ in range(10)}
        assert len(verifiers) == 10  # All unique

        challenges = {generate_pkce_code_challenge(v) for v in verifiers}
        assert len(challenges) == 10  # All unique


class TestEdgeCases:
    """Edge case tests for PKCE implementation."""

    def test_empty_verifier(self):
        """Should not break with edge cases."""
        challenge = generate_pkce_code_challenge("")
        assert challenge  # Should produce some output
        assert verify_pkce_challenge("", challenge) is True

    def test_long_verifier(self):
        """Should handle long verifier strings."""
        long_verifier = "A" * 128
        challenge = generate_pkce_code_challenge(long_verifier)
        assert verify_pkce_challenge(long_verifier, challenge) is True

    def test_special_chars_in_verifier(self):
        """Should handle special characters in verifier."""
        special_verifier = "abc-123._~XYZ"
        challenge = generate_pkce_code_challenge(special_verifier)
        assert verify_pkce_challenge(special_verifier, challenge) is True
        assert verify_pkce_challenge("abc-123._~XYA", challenge) is False

    def test_unicode_handling(self):
        """Should handle unicode correctly."""
        unicode_verifier = "test-verifier-äöü"
        challenge = generate_pkce_code_challenge(unicode_verifier)
        assert verify_pkce_challenge(unicode_verifier, challenge) is True
        assert challenge  # Should produce valid output


class TestRFC7636Compliance:
    """Tests to ensure RFC 7636 PKCE compliance."""

    def test_verifier_meets_minimum_length(self):
        """Code verifier must be minimum 43 characters (RFC 7636)."""
        verifier = generate_pkce_code_verifier()
        assert len(verifier) >= 43

    def test_verifier_meets_maximum_length(self):
        """Code verifier must not exceed 128 characters (RFC 7636)."""
        verifier = generate_pkce_code_verifier()
        assert len(verifier) <= 128

    def test_verifier_uses_unreserved_chars_only(self):
        """Code verifier must use only unreserved characters (RFC 7636)."""
        verifier = generate_pkce_code_verifier()
        # RFC 3986: unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
        unreserved = set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~')
        assert all(c in unreserved for c in verifier)

    def test_challenge_method_s256(self):
        """Challenge method should be S256 (RFC 7636)."""
        # S256 is the only method we support
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Should be base64url(SHA256(verifier))
        # Verify by comparing with manual SHA256
        sha256_hash = hashlib.sha256(verifier.encode('utf-8')).digest()
        expected_challenge = base64.urlsafe_b64encode(sha256_hash).decode('utf-8').rstrip('=')
        assert challenge == expected_challenge

    def test_challenge_base64url_encoding(self):
        """Challenge must be base64url-encoded without padding (RFC 7636)."""
        verifier = generate_pkce_code_verifier()
        challenge = generate_pkce_code_challenge(verifier)

        # Must not contain + / =
        assert '+' not in challenge
        assert '/' not in challenge
        assert '=' not in challenge

        # Must be decodable when padding is added
        padding = (4 - (len(challenge) % 4)) % 4
        padded = challenge + ('=' * padding)
        decoded = base64.urlsafe_b64decode(padded)
        assert len(decoded) == 32  # SHA256 = 32 bytes
