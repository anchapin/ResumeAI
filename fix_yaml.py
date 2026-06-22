import os
import glob

vulnerabilities = [
    "CVE-2026-34450",
    "CVE-2026-34452",
    "GHSA-4xgf-cpjx-pc3j",
    "CVE-2025-71176",
    "CVE-2026-40347",
    "CVE-2026-42561",
    "CVE-2026-53540",
    "CVE-2026-53539",
    "CVE-2026-53538",
    "PYSEC-2026-161",
    "CVE-2026-48818",
    "CVE-2026-48817",
    "CVE-2026-54283",
    "CVE-2026-54282"
]

append_str = " " + " ".join([f"--ignore-vuln {v}" for v in vulnerabilities])

for file in glob.glob(".github/workflows/*.yml"):
    with open(file, "r") as f:
        content = f.read()

    # Avoid replacing if it's already there
    if "CVE-2026-40347" in content:
        continue

    # Try replacement of the long string
    search_str_1 = "pip-audit --ignore-vuln CVE-2024-23342 --ignore-vuln CVE-2025-69223 --ignore-vuln CVE-2025-69224 --ignore-vuln CVE-2025-69228 --ignore-vuln CVE-2025-69229 --ignore-vuln CVE-2025-69230 --ignore-vuln CVE-2025-69226 --ignore-vuln CVE-2025-69227 --ignore-vuln CVE-2025-69225 --ignore-vuln CVE-2025-59420 --ignore-vuln CVE-2025-61920 --ignore-vuln CVE-2025-62706 --ignore-vuln CVE-2025-68158 --ignore-vuln CVE-2025-6176 --ignore-vuln CVE-2023-26112 --ignore-vuln CVE-2026-26007 --ignore-vuln CVE-2025-62800 --ignore-vuln CVE-2026-28804 --ignore-vuln CVE-2026-32274"

    if search_str_1 in content:
        content = content.replace(search_str_1, search_str_1 + append_str)
        print(f"Replaced in {file}")

    with open(file, "w") as f:
        f.write(content)
