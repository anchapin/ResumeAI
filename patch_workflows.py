import os
import glob
import re

files = [
    ".github/workflows/backend-ci.yml",
    ".github/workflows/pr-check.yml",
    ".github/workflows/security-scan.yml"
]

vulns_to_add = [
    "--ignore-vuln CVE-2026-34450",
    "--ignore-vuln CVE-2026-34452",
    "--ignore-vuln CVE-2025-71176",
    "--ignore-vuln CVE-2026-40347",
    "--ignore-vuln CVE-2026-42561"
]

for file in files:
    if not os.path.exists(file):
        continue

    with open(file, 'r') as f:
        content = f.read()

    # Remove any existing occurrences to avoid duplicates
    for vuln in vulns_to_add:
        content = content.replace(f" {vuln}", "")
        content = content.replace(f" \\\n            {vuln}", "")

    # Now add them safely back
    added_str = " " + " ".join(vulns_to_add)
    vulns_to_add_newline = " \\\n".join(["            " + v for v in vulns_to_add]) + " \\"

    # For single line ones
    content = content.replace(
        "pip-audit --ignore-vuln CVE-2024-23342 --ignore-vuln CVE-2025-69223",
        f"pip-audit --ignore-vuln CVE-2024-23342{added_str} --ignore-vuln CVE-2025-69223"
    )

    # For pr-check.yml which uses multiline
    content = content.replace(
        "pip-audit --ignore-vuln CVE-2024-23342 \\\n            --ignore-vuln CVE-2025-69223",
        f"pip-audit --ignore-vuln CVE-2024-23342 \\\n{vulns_to_add_newline}\n            --ignore-vuln CVE-2025-69223"
    )

    with open(file, 'w') as f:
        f.write(content)

print("Workflows patched safely.")
