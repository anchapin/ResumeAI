import hashlib

def get_legacy_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()
