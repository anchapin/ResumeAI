# The CVEs are clearly present in the prompt output above "Found 2 known vulnerabilities in 1 package":
# 2026-04-11T00:03:36.8124690Z --------- ------- -------------- ------------
# 2026-04-11T00:03:36.8125166Z anthropic 0.86.0  CVE-2026-34450 0.87.0
# 2026-04-11T00:03:36.8125553Z anthropic 0.86.0  CVE-2026-34452 0.87.0
print("Extracted exact CVEs from prompt: CVE-2026-34450, CVE-2026-34452")
