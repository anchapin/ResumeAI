const issue = `
Found 6 known vulnerabilities in 4 packages
Name             Version ID             Fix Versions
---------------- ------- -------------- ------------
anthropic        0.86.0  CVE-2026-34450 0.87.0
anthropic        0.86.0  CVE-2026-34452 0.87.0
pytest           9.0.2   CVE-2025-71176 9.0.3
python-multipart 0.0.22  CVE-2026-40347 0.0.26
python-multipart 0.0.22  CVE-2026-42561 0.0.27
starlette        0.52.1  PYSEC-2026-161 1.0.1
`
console.log("We need to update anthropic to 0.87.0, pytest to 9.0.3, python-multipart to 0.0.27, starlette to 1.0.1")
