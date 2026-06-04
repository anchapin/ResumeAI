import timeit
import re

text_input = """
This is a test <script>alert("hello")</script> resume.
It has some <iframe src="http://example.com"></iframe> and some <input type="text"> fields.
Also an <object data="test.swf"></object>
There's normal text here.
<button onclick="bad()">Click me</button>
<a href="javascript:void(0)">Link</a>
""" * 100

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
_HREF_JS_PATTERN = re.compile(r'href\s*=\s*["\']javascript:[^"\']*["\']', flags=re.IGNORECASE)
_JS_DATA_PATTERN = re.compile(r"(?:javascript|data)\s*:", flags=re.IGNORECASE)

def sanitize_compiled(text):
    if not text: return None
    text = _SCRIPT_PATTERN.sub("", text)
    for tag_content_pattern, tag_inline_pattern in _DANGEROUS_TAGS_PATTERNS:
        text = tag_content_pattern.sub("", text)
        text = tag_inline_pattern.sub("", text)
    text = _ON_EVENT_PATTERN.sub("", text)
    text = _HREF_JS_PATTERN.sub('href="#"', text)
    text = _JS_DATA_PATTERN.sub("", text)
    stripped = text.strip() if text else ""
    return stripped if stripped else None

print("Uncompiled:", timeit.timeit(lambda: sanitize_uncompiled(text_input), number=100))
print("Compiled:", timeit.timeit(lambda: sanitize_compiled(text_input), number=100))
