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

## 2026-03-11 - Route Decorator Placement Error
**Learning:** During previous automated refactors or merges, the FastAPI `@router.post("/insights")` and `@rate_limit("20/minute")` decorators were mistakenly placed on the `_build_ats_check` helper function instead of the `get_jd_insights` endpoint function in `resume-api/api/jd_routes.py`. This caused the `slowapi` rate limiter to throw an `Exception: No "request" or "websocket" argument on function` because `_build_ats_check` doesn't take a `Request` object.
**Action:** When debugging CI failures involving `slowapi` or route loading errors, always check that route decorators are applied to the correct endpoint function that accepts the `request: Request` parameter.

## 2024-06-12 - Python Regex Nested Loop Optimization
**Learning:** Checking for multiple static substrings or substring-regexes inside a nested loop (e.g., iterating through multiple string indicators for different experience levels inside another loop) forces Python to compile and run hundreds of regex calls over and over per function call. Consolidating all `n` indicators for a given string into a single pre-compiled `(?:word1|word2|word3)` regex reduces the execution time massively (e.g., from ~4.1s down to ~0.4s for 100k executions).
**Action:** When searching for multiple possible keywords/phrases to match an enum or category, pre-compile all options into a single OR-joined regex at the class level instead of using nested loops.
## 2024-05-24 - Batch string processing and static lookups for text extraction
**Learning:** Calling a text extraction function (like `_extract_tech_terms`) in a loop over many small fragments (bullets, summaries) causes significant overhead and excessive lowercasing operations. Iterating over a long list of static tech terms `N` times for `M` text fragments creates an O(N*M) bottleneck.
**Action:** When extracting data from multiple string fields, accumulate them into a single list, `.join()` them into one large string, and process it once. Hoist the static list of terms to the module level as a `frozenset` or `tuple` to prevent recreating it on every function call. This yields a >2x speedup for complex resumes without altering behavior.

## 2026-03-22 - Optimize Repeated String Iteration with Regex Iterators
**Learning:** In text parsing functions (like `JobDescriptionParser._extract_skills`), returning early using list slicing after a loop isn't enough to prevent redundant search. Also, using `findall()` to load all capitalized words in a large text string into a list before iterating over them creates unnecessary memory overhead. Changing `findall()` to `finditer()` and calling `.group(0)` creates an iterator that matches words on the fly. This prevents buffering thousands of matches in memory simultaneously and, when combined with an early `break` (e.g., stopping when 50 items are found), avoids executing the regex over the entire remaining string. This yielded a ~40% speedup.
**Action:** Always prefer `finditer` over `findall` for regex extraction in loops when there's an early exit condition, to avoid the memory and CPU overhead of matching the entire string upfront.
