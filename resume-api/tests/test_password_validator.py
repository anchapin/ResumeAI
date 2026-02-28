import pytest
from lib.security.password_validator import (
    validate_password_strength,
    get_password_strength_score,
)


class TestPasswordValidation:
    """Test password validation functionality."""

    def test_valid_password(self):
        """Test that a valid password passes validation."""
        is_valid, error = validate_password_strength("SecurePass123!")
        assert is_valid is True
        assert error is None

    def test_short_password(self):
        """Test that short password fails."""
        is_valid, error = validate_password_strength("Short1!")
        assert is_valid is False
        assert "at least 8 characters" in error.lower()

    def test_no_uppercase(self):
        """Test that password without uppercase fails."""
        is_valid, error = validate_password_strength("lowercase123!")
        assert is_valid is False
        assert "uppercase" in error.lower()

    def test_no_lowercase(self):
        """Test that password without lowercase fails."""
        is_valid, error = validate_password_strength("UPPERCASE123!")
        assert is_valid is False
        assert "lowercase" in error.lower()

    def test_no_number(self):
        """Test that password without number fails."""
        is_valid, error = validate_password_strength("NoNumbersHere!")
        assert is_valid is False
        assert "number" in error.lower()

    def test_no_special_char(self):
        """Test that password without special character fails."""
        is_valid, error = validate_password_strength("NoSpecialChars123")
        assert is_valid is False
        assert "special character" in error.lower()

    def test_common_password(self):
        """Test that common passwords fail."""
        is_valid, error = validate_password_strength("password123")
        assert is_valid is False
        assert "too common" in error.lower()

    def test_sequential_chars(self):
        """Test that sequential characters fail."""
        is_valid, error = validate_password_strength("abcABC123!")
        assert is_valid is False
        assert "sequential" in error.lower()

    def test_sequential_numbers(self):
        """Test that sequential numbers fail."""
        is_valid, error = validate_password_strength("Pass1234!")
        assert is_valid is False
        assert "sequential" in error.lower()

    def test_repeating_chars(self):
        """Test that repeating characters fail."""
        is_valid, error = validate_password_strength("Passssword123!")
        assert is_valid is False
        assert "repeating" in error.lower()

    def test_very_long_password(self):
        """Test that passwords over 100 chars fail."""
        is_valid, error = validate_password_strength("a" * 101)
        assert is_valid is False
        assert "100 characters" in error.lower()

    def test_empty_password(self):
        """Test that empty password fails."""
        is_valid, error = validate_password_strength("")
        assert is_valid is False
        assert "required" in error.lower()


class TestPasswordStrengthScore:
    """Test password strength scoring."""

    def test_weak_password_score(self):
        """Test weak password gets score of 0-2."""
        score = get_password_strength_score("Abc123!")
        assert 0 <= score <= 2

    def test_medium_password_score(self):
        """Test medium password gets score of 3-4."""
        score = get_password_strength_score("Abcdef123!")
        assert 3 <= score <= 4

    def test_strong_password_score(self):
        """Test strong password gets score of 5."""
        score = get_password_strength_score("Abcdef123!@#")
        assert score == 5

    def test_very_strong_password_score(self):
        """Test very strong password gets score of 4-6."""
        score = get_password_strength_score("AbcdefGHI123!@#XYZ")
        assert score >= 5

    def test_long_password_bonus(self):
        """Test long passwords get bonus points."""
        short_score = get_password_strength_score("Abc123!")
        long_score = get_password_strength_score("Abcdefghijkl123!")
        assert long_score > short_score

    def test_no_repeating_bonus(self):
        """Test passwords without repeating get bonus."""
        repeating_score = get_password_strength_score("Aabb123!")
        no_repeat_score = get_password_strength_score("Abc123!")
        assert no_repeat_score > repeating_score
