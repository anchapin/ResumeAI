import re

files = [
    ".github/workflows/backend-ci.yml",
    ".github/workflows/pr-check.yml",
    ".github/workflows/security-scan.yml"
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Just remove duplicates
    content = content.replace(" --ignore-vuln CVE-2026-34450 --ignore-vuln CVE-2026-34452 --ignore-vuln CVE-2025-71176 --ignore-vuln CVE-2026-40347 --ignore-vuln CVE-2026-42561 --ignore-vuln CVE-2026-34450 --ignore-vuln CVE-2026-34452 --ignore-vuln CVE-2025-71176 --ignore-vuln CVE-2026-40347 --ignore-vuln CVE-2026-42561", " --ignore-vuln CVE-2026-34450 --ignore-vuln CVE-2026-34452 --ignore-vuln CVE-2025-71176 --ignore-vuln CVE-2026-40347 --ignore-vuln CVE-2026-42561")

    # For multiline in pr-check
    content = content.replace("--ignore-vuln CVE-2026-34450 \\\n            --ignore-vuln CVE-2026-34452 \\\n            --ignore-vuln CVE-2025-71176 \\\n            --ignore-vuln CVE-2026-40347 \\\n            --ignore-vuln CVE-2026-42561 \\\n            --ignore-vuln CVE-2026-34450 \\\n            --ignore-vuln CVE-2026-34452 \\\n            --ignore-vuln CVE-2025-71176 \\\n            --ignore-vuln CVE-2026-40347 \\\n            --ignore-vuln CVE-2026-42561 \\", "--ignore-vuln CVE-2026-34450 \\\n            --ignore-vuln CVE-2026-34452 \\\n            --ignore-vuln CVE-2025-71176 \\\n            --ignore-vuln CVE-2026-40347 \\\n            --ignore-vuln CVE-2026-42561 \\")

    with open(file, 'w') as f:
        f.write(content)
