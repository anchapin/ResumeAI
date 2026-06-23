import re
from typing import Optional


# Pre-compiled regex patterns for performance optimization
UPPER_RE = re.compile(r"[A-Z]")
LOWER_RE = re.compile(r"[a-z]")
DIGIT_RE = re.compile(r"\d")
SPECIAL_RE = re.compile(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/|]')
SEQ_LETTERS_RE = re.compile(
    r"(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|rst|stu|tuv|uvw|vwx|wxy|xyz)",
    re.IGNORECASE,
)
SEQ_NUMBERS_RE = re.compile(r"(1234|2345|3456|4567|5678|6789|7890)")
REPEAT_RE = re.compile(r"(.)\1{2,}")
REPEAT_SCORE_RE = re.compile(r"(.)\1{1,}")


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

    # Common passwords list - check first before other validations
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
        "password123",
    }

    if password.lower() in common_passwords:
        return False, "Password is too common. Please choose a stronger password."

    # Check for at least one uppercase letter
    if not UPPER_RE.search(password):
        return False, "Password must contain at least one uppercase letter"

    # Check for at least one lowercase letter
    if not LOWER_RE.search(password):
        return False, "Password must contain at least one lowercase letter"

    # Check for at least one number
    if not DIGIT_RE.search(password):
        return False, "Password must contain at least one number"

    # Check for at least one special character
    if not SPECIAL_RE.search(password):
        return False, "Password must contain at least one special character"

    # Check for sequential characters (e.g., "abc", "123", "qwerty")
    if SEQ_LETTERS_RE.search(password):
        return False, "Password must not contain sequential characters"

    # Check for 4 or more sequential numbers (allow 3 like 123)
    if SEQ_NUMBERS_RE.search(password):
        return False, "Password must not contain sequential characters"

    # Check for repeating characters (e.g., "aaa", "111")
    if REPEAT_RE.search(password):
        return False, "Password must not contain repeating characters"

    return True, None


def get_password_strength_score(password: str) -> int:
    """
    Calculate password strength score (0-5).

    Scoring:
    0: Very weak
    1: Weak
    2: Fair
    3: Medium
    4: Strong
    5: Very strong
    """
    score = 0

    # Check for variety of character types
    has_upper = bool(UPPER_RE.search(password))
    has_lower = bool(LOWER_RE.search(password))
    has_digit = bool(DIGIT_RE.search(password))
    has_special = bool(SPECIAL_RE.search(password))

    variety_count = sum([has_upper, has_lower, has_digit, has_special])

    # Base score from character variety
    if variety_count == 4:
        score += 1
    elif variety_count == 3:
        score += 0.75
    elif variety_count == 2:
        score += 0.5
    elif variety_count == 1:
        score += 0.25

    # Length bonuses (heavier weighting for longer passwords)
    has_repeat = REPEAT_SCORE_RE.search(password)
    if len(password) >= 8:
        score += 1.5
    if len(password) >= 12:
        score += 2
    if len(password) >= 16:
        score += 1

    # Penalty for repeating characters on short passwords
    if has_repeat and len(password) < 12:
        score -= 1

    # Bonus for not having repeating characters
    if not has_repeat:
        score += 1.5

    return max(min(int(score), 5), 0)
