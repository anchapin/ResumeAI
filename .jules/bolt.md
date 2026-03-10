## 2024-05-23 - Storage Optimization Rejected

**Learning:** Checking for localStorage availability by writing to it is an anti-pattern for performance, but replacing it with a simple existence check (`typeof localStorage !== 'undefined'`) can reduce robustness by masking `QuotaExceededError` or `SecurityError` (e.g., Safari Private Mode).
**Action:** When optimizing browser API checks, ensure that error handling (like catching `QuotaExceededError`) is preserved or improved, and be aware that simple existence checks might report false positives for usability. If robust detection requires I/O, consider caching the result (lazy initialization) instead of removing the check or repeating it.

## 2024-05-24 - Python Regex Pre-compilation Impact

**Learning:** Pre-compiling regexes in Python (`re.compile`) yielded negligible performance gains (~0.7%) on its own, likely due to Python's internal regex caching. Significant improvement (~3.8%) was only achieved when combining it with algorithmic optimizations (early loop breaks) to avoid unnecessary regex executions entirely.
**Action:** When optimizing regex-heavy code in Python, prioritize algorithmic changes that skip execution over simple pre-compilation, as the latter is often already handled by the interpreter's cache for common patterns.

## 2024-05-25 - Python Regex Pattern Consolidation and Early Returns

**Learning:** In text parsing code (like `JobDescriptionParser._extract_section_content`), looping over uncompiled regex patterns and attempting to match each line sequentially is a massive performance bottleneck. Combining multiple patterns into a single pre-compiled regex (`^(?:[•\-\*]|\d+[\.\)]|(?:[A-Z][a-zA-Z]+)\s*[:\-])\s*(.+)$`) avoids repetitive regex execution overhead. Furthermore, when there's an artificial limit on output size (like `items[:20]`), failing to implement an early `break` leads to wasted work on long documents. Combining the regex compilation and early termination reduced the execution time by ~94% (6.9s down to 0.38s over 10,000 runs) in benchmarks.
**Action:** When extracting a limited number of items from a string using regex, always pre-compile the patterns, try to consolidate multiple regex patterns into one single logical OR pattern, and implement early termination as soon as the target item limit is reached.

## 2026-03-09 - Optimize keyword extraction using collections.Counter
**Learning:** Manual dictionary-based word frequency counting (incrementing keys and sorting `.items()`) is slower than `collections.Counter`, which is implemented in C and optimized for this exact use case.
**Action:** Always prefer `collections.Counter` along with a generator expression for frequency counting of elements in sequences, especially for strings and text processing.

## 2024-05-26 - HTTP Client Connection Reuse
**Learning:** Instantiating `httpx.AsyncClient` inside iterative loops (e.g., when making API requests per school or previous company) causes redundant SSL/TCP handshakes, significantly increasing latency and overhead.
**Action:** Always instantiate HTTP clients (like `httpx.AsyncClient` or `requests.Session`) outside of iterative loops or parallel tasks, and pass the single client instance to helper methods to ensure connection reuse.
