## 2024-05-23 - Storage Optimization Rejected
**Learning:** Checking for localStorage availability by writing to it is an anti-pattern for performance, but replacing it with a simple existence check (`typeof localStorage !== 'undefined'`) can reduce robustness by masking `QuotaExceededError` or `SecurityError` (e.g., Safari Private Mode).
**Action:** When optimizing browser API checks, ensure that error handling (like catching `QuotaExceededError`) is preserved or improved, and be aware that simple existence checks might report false positives for usability. If robust detection requires I/O, consider caching the result (lazy initialization) instead of removing the check or repeating it.

## 2024-05-24 - Python Regex Pre-compilation Impact
**Learning:** Pre-compiling regexes in Python (`re.compile`) yielded negligible performance gains (~0.7%) on its own, likely due to Python's internal regex caching. Significant improvement (~3.8%) was only achieved when combining it with algorithmic optimizations (early loop breaks) to avoid unnecessary regex executions entirely.
**Action:** When optimizing regex-heavy code in Python, prioritize algorithmic changes that skip execution over simple pre-compilation, as the latter is often already handled by the interpreter's cache for common patterns.

## 2025-05-25 - Python Constant Instantiation Overhead
**Learning:** Instantiating large data structures (lists, sets) inside frequently called methods added measurable overhead (~1.8% CPU time per parse). Moving these to class constants eliminated redundant allocations.
**Action:** Identify and hoist static data structures (like keyword lists or stop words) to class or module level constants, especially in hot paths like parsers or tight loops.
