import datetime

journal_file = ".jules/sentinel.md"
with open(journal_file, "r") as f:
    content = f.read()

# Make sure not to duplicate
if "Command Injection via path interpolation in df" not in content:
    date_str = datetime.date.today().strftime("%Y-%m-%d")
    learning = f"""
## {date_str} - [Command Injection via path interpolation in df]

**Vulnerability:** The `subprocess.run` call in `resume-api/lib/utils/ecryptfs_utils.py` executed `df -Th <path>`. A path starting with `-` (like `-o`) could be interpreted as an option by `df`, leading to argument/command injection.
**Learning:** Argument injection occurs when user-controlled strings are passed directly to commands without explicitly separating options from positional arguments, even when using `subprocess.run` with `shell=False`.
**Prevention:** Always use the `--` (end of options) delimiter when passing variable file paths to command-line utilities (e.g., `["df", "-Th", "--", path]`) to force the command to treat the path as a positional argument.
"""
    with open(journal_file, "a") as f:
        f.write(learning)
