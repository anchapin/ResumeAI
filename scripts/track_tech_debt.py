#!/usr/bin/env python3
"""
Tech Debt Tracker

Scans the codebase for TODO, FIXME, XXX, HACK comments and code smells.
Outputs a report of technical debt items found.
"""

import os
import re
import json
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List
from collections import Counter


@dataclass
class TechDebtItem:
    file: str
    line: int
    comment: str
    type: str  # TODO, FIXME, XXX, HACK


# Patterns to search
PATTERNS = {
    'TODO': r'#\s*TODO[:\s]',
    'FIXME': r'#\s*FIXME[:\s]',
    'XXX': r'#\s*XXX[:\s]',
    'HACK': r'#\s*HACK[:\s]',
}

# File extensions to scan
EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx', '.vue', '.go', '.java', '.rb'}


def scan_file(filepath: Path) -> List[TechDebtItem]:
    """Scan a single file for tech debt comments."""
    items = []
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                for debt_type, pattern in PATTERNS.items():
                    if re.search(pattern, line, re.IGNORECASE):
                        items.append(TechDebtItem(
                            file=str(filepath),
                            line=line_num,
                            comment=line.strip(),
                            type=debt_type
                        ))
    except Exception as e:
        print(f"Error scanning {filepath}: {e}")
    
    return items


def scan_directory(root_dir: str) -> List[TechDebtItem]:
    """Scan directory for tech debt items."""
    items = []
    root = Path(root_dir)
    
    # Directories to skip
    skip_dirs = {
        'node_modules', '.git', '__pycache__', '.venv', 'venv',
        'dist', 'build', '.next', '.nuxt', 'coverage', '.pytest_cache',
        '.mypy_cache', '.tox'
    }
    
    for filepath in root.rglob('*'):
        # Skip directories and non-code files
        if filepath.is_dir():
            continue
        if filepath.suffix not in EXTENSIONS:
            continue
        
        # Skip excluded directories
        if any(skip in filepath.parts for skip in skip_dirs):
            continue
        
        items.extend(scan_file(filepath))
    
    return items


def generate_report(items: List[TechDebtItem], output_format: str = 'text'):
    """Generate a report from tech debt items."""
    if not items:
        return "No tech debt items found."
    
    if output_format == 'json':
        return json.dumps([asdict(item) for item in items], indent=2)
    
    # Text report
    lines = ["# Tech Debt Report", "=" * 50, ""]
    
    # Group by type
    by_type = Counter(item.type for item in items)
    lines.append("Summary:")
    for debt_type, count in sorted(by_type.items()):
        lines.append(f"  {debt_type}: {count}")
    lines.append("")
    
    # Group by file
    by_file = {}
    for item in items:
        if item.file not in by_file:
            by_file[item.file] = []
        by_file[item.file].append(item)
    
    lines.append("Details by file:")
    for filepath, file_items in sorted(by_file.items()):
        lines.append(f"\n{filepath}:")
        for item in file_items:
            lines.append(f"  Line {item.line}: [{item.type}] {item.comment[:80]}")
    
    return "\n".join(lines)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Track tech debt in codebase')
    parser.add_argument('directory', nargs='?', default='.', help='Directory to scan')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')
    parser.add_argument('--output', help='Output file (optional)')
    
    args = parser.parse_args()
    
    items = scan_directory(args.directory)
    report = generate_report(items, args.format)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report written to {args.output}")
    else:
        print(report)
    
    # Exit with count for CI integration
    return len(items)


if __name__ == '__main__':
    count = main()
    exit(0 if count >= 0 else 1)
