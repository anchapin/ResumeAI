import re
from typing import Optional


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength according to NIST guidelines.

    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character (!@#$%^&*)
    - No common passwords
    - No sequential or repeating characters

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"

    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if len(password) > 100:
        return False, "Password must not exceed 100 characters"

    # Check for at least one uppercase letter
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    # Check for at least one lowercase letter
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    # Check for at least one number
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"

    # Check for at least one special character
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/|]', password):
        return False, "Password must contain at least one special character"

    # Check for sequential characters (e.g., "abc", "123", "qwerty")
    if re.search(
        r"(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|rst|stu|tuv|uvw|vwx|wxy|xyz)",
        password,
        re.IGNORECASE,
    ):
        return False, "Password must not contain sequential characters"

    if re.search(r"(123|234|345|456|567|678|789|890|901|012)", password):
        return False, "Password must not contain sequential numbers"

    # Check for repeating characters (e.g., "aaa", "111")
    if re.search(r"(.)\1{2,}", password):
        return False, "Password must not contain repeating characters"

    # Common passwords list
    common_passwords = {
        "password",
        "Password1!",
        "12345678",
        "qwerty123",
        "admin",
        "welcome",
        "monkey",
        "dragon",
        "sunshine",
        "letmein",
        "master",
        "hello",
        "football",
        "iloveyou",
        "princess",
        "adobe123",
        "admin123",
        "qwertyuiop",
        "123456789",
        "abc123",
    }

    if password.lower() in common_passwords:
        return False, "Password is too common. Please choose a stronger password."

    return True, None


def get_password_strength_score(password: str) -> int:
    """
    Calculate password strength score (0-4).

    Scoring:
    0: Very weak (meets minimum requirements)
    1: Weak
    2: Medium
    3: Strong
    4: Very strong
    """
    score = 0

    if len(password) >= 12:
        score += 1
    if len(password) >= 16:
        score += 1

    # Check for variety of character types
    has_upper = bool(re.search(r"[A-Z]", password))
    has_lower = bool(re.search(r"[a-z]", password))
    has_digit = bool(re.search(r"\d", password))
    has_special = bool(re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/|]', password))

    variety_count = sum([has_upper, has_lower, has_digit, has_special])

    if variety_count >= 4:
        score += 2
    elif variety_count >= 3:
        score += 1

    # Bonus for not having common patterns
    if not re.search(r"(.)\1", password):  # No repeating
        score += 1

    return min(score, 4)
