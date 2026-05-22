import timeit
import re
from typing import Optional

def sanitize_html_old(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    dangerous_tags = ["iframe", "object", "embed", "form", "input", "button"]
    for tag in dangerous_tags:
        text = re.sub(f"<{tag}[^>]*>.*?</{tag}>", "", text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(f"<{tag}[^>]*/?>", "", text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', "", text, flags=re.IGNORECASE)
    text = re.sub(r"javascript\s*:", "", text, flags=re.IGNORECASE)
    text = re.sub(r"data\s*:", "", text, flags=re.IGNORECASE)
    return text.strip()


_SCRIPT_PATTERN = re.compile(r"<script[^>]*>.*?</script>", flags=re.IGNORECASE | re.DOTALL)

_DANGEROUS_TAGS_PATTERNS = [
    (
        re.compile(f"<{tag}[^>]*>.*?</{tag}>", flags=re.IGNORECASE | re.DOTALL),
        re.compile(f"<{tag}[^>]*/?>", flags=re.IGNORECASE)
    )
    for tag in ["iframe", "object", "embed", "form", "input", "button"]
]

_EVENT_HANDLER_PATTERN = re.compile(r'on\w+\s*=\s*["\'][^"\']*["\']', flags=re.IGNORECASE)
_JAVASCRIPT_URL_PATTERN = re.compile(r"javascript\s*:", flags=re.IGNORECASE)
_DATA_URL_PATTERN = re.compile(r"data\s*:", flags=re.IGNORECASE)

def sanitize_html_new(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    text = _SCRIPT_PATTERN.sub("", text)
    for tag_content_pattern, tag_pattern in _DANGEROUS_TAGS_PATTERNS:
        text = tag_content_pattern.sub("", text)
        text = tag_pattern.sub("", text)
    text = _EVENT_HANDLER_PATTERN.sub("", text)
    text = _JAVASCRIPT_URL_PATTERN.sub("", text)
    text = _DATA_URL_PATTERN.sub("", text)
    return text.strip()

test_string = """
<p>Hello world!</p>
<script>alert(1);</script>
<iframe src="http://evil.com"></iframe>
<div onclick="doSomething()">Click me</div>
<a href="javascript:alert(1)">Link</a>
<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTs8L3NjcmlwdD4=">Link2</a>
<form><input type="text"><button>Submit</button></form>
"""

t_old = timeit.timeit(lambda: sanitize_html_old(test_string), number=10000)
t_new = timeit.timeit(lambda: sanitize_html_new(test_string), number=10000)

print(f"Old time: {t_old:.4f}s")
print(f"New time: {t_new:.4f}s")
print(f"Speedup: {t_old/t_new:.2f}x")
