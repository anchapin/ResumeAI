import timeit
import re

short_text = "Software Engineer at <script>alert('xss')</script> Company. Used <button>React</button>"

def sanitize_uncompiled(text):
    if not text: return None
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    dangerous_tags = ["iframe", "object", "embed", "form", "input", "button"]
    for tag in dangerous_tags:
        text = re.sub(f"<{tag}[^>]*>.*?</{tag}>", "", text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(f"<{tag}[^>]*/?>", "", text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', "", text, flags=re.IGNORECASE)
    text = re.sub(r"javascript\s*:", "", text, flags=re.IGNORECASE)
    text = re.sub(r"data\s*:", "", text, flags=re.IGNORECASE)
    return text.strip()

_SCRIPT_PATTERN = re.compile(r"<script[^>]*>.*?</script\s*[^>]*>", flags=re.IGNORECASE | re.DOTALL)
_DANGEROUS_TAGS_PATTERNS = [
    (
        re.compile(rf"<{tag}[^>]*>.*?</{tag}>", flags=re.IGNORECASE | re.DOTALL),
        re.compile(rf"<{tag}[^>]*/?>", flags=re.IGNORECASE),
    )
    for tag in ["iframe", "object", "embed", "form", "input", "button"]
]
_ON_EVENT_PATTERN = re.compile(r'on\w+\s*=\s*(?:["\'][^"\']*["\']|[^>\s]+)', flags=re.IGNORECASE)
_JS_DATA_PATTERN = re.compile(r"(?:javascript|data)\s*:", flags=re.IGNORECASE)

def sanitize_compiled(text):
    if not text: return None
    text = _SCRIPT_PATTERN.sub("", text)
    for tag_content_pattern, tag_inline_pattern in _DANGEROUS_TAGS_PATTERNS:
        text = tag_content_pattern.sub("", text)
        text = tag_inline_pattern.sub("", text)
    text = _ON_EVENT_PATTERN.sub("", text)
    text = _JS_DATA_PATTERN.sub("", text)
    return text.strip()

print("Uncompiled:", timeit.timeit(lambda: sanitize_uncompiled(short_text), number=10000))
print("Compiled:", timeit.timeit(lambda: sanitize_compiled(short_text), number=10000))
