#!/usr/bin/env python3
"""
Bundle Size Analyzer

Analyzes npm and Python dependencies to detect heavy packages.
Outputs warnings for packages exceeding size thresholds.
"""

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


# Size thresholds in KB
THRESHOLDS = {
    'warning': 500,      # 500KB - warning
    'critical': 1000,   # 1MB - critical
}


@dataclass
class PackageInfo:
    name: str
    version: str
    size_kb: float
    category: str  # 'npm' or 'python'


def run_command(cmd: List[str]) -> str:
    """Run a command and return output."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout + result.stderr
    except Exception as e:
        return f"Error: {e}"


def analyze_npm_packages(project_dir: str) -> List[PackageInfo]:
    """Analyze npm bundle sizes."""
    packages = []
    
    # Try to use npm to get package info
    package_json_path = Path(project_dir) / 'package.json'
    if not package_json_path.exists():
        return packages
    
    try:
        # Get installed package sizes using npm
        output = run_command(['npm', 'list', '--json', '--depth=0'])
        data = json.loads(output) if output else {}
        
        dependencies = data.get('dependencies', {})
        
        for name, info in dependencies.items():
            # Estimate based on common package sizes (this is simplified)
            # In production, use webpack-bundle-analyzer
            size = estimate_npm_package_size(name)
            if size >= THRESHOLDS['warning']:
                packages.append(PackageInfo(
                    name=name,
                    version=info.get('version', 'unknown'),
                    size_kb=size,
                    category='npm'
                ))
    except Exception as e:
        print(f"Error analyzing npm packages: {e}")
    
    return packages


def estimate_npm_package_size(package_name: str) -> float:
    """Estimate npm package size based on known patterns."""
    # Known heavy packages (rough estimates in KB)
    known_heavy = {
        'moment': 300,
        'lodash': 500,
        'underscore': 60,
        'react': 150,
        'react-dom': 400,
        'vue': 500,
        '@tensorflow/tfjs': 2000,
        'three': 1500,
        'phaser': 2000,
        'matter-js': 500,
    }
    
    # Check if known heavy
    lower_name = package_name.lower()
    for known, size in known_heavy.items():
        if known in lower_name:
            return size
    
    # Default estimate
    return 50


def analyze_python_packages(requirements_file: str) -> List[PackageInfo]:
    """Analyze Python package sizes."""
    packages = []
    
    req_path = Path(requirements_file)
    if not req_path.exists():
        return packages
    
    try:
        with open(req_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                # Parse package name
                pkg = line.split('==')[0].split('>=')[0].split('<=')[0].strip()
                if pkg.startswith('-'):
                    continue
                
                size = estimate_python_package_size(pkg)
                if size >= THRESHOLDS['warning']:
                    packages.append(PackageInfo(
                        name=pkg,
                        version='latest',
                        size_kb=size,
                        category='python'
                    ))
    except Exception as e:
        print(f"Error analyzing Python packages: {e}")
    
    return packages


def estimate_python_package_size(package_name: str) -> float:
    """Estimate Python package size based on known patterns."""
    # Known heavy packages (rough estimates in KB)
    known_heavy = {
        'tensorflow': 500000,
        'torch': 500000,
        'numpy': 50000,
        'pandas': 100000,
        'scipy': 150000,
        'opencv-python': 80000,
        'pillow': 60000,
        'reportlab': 20000,
        'matplotlib': 80000,
        'sklearn': 50000,
    }
    
    lower_name = package_name.lower()
    for known, size in known_heavy.items():
        if known in lower_name:
            return size
    
    return 50


def generate_report(packages: List[PackageInfo]) -> str:
    """Generate a bundle size report."""
    if not packages:
        return "No heavy dependencies detected."
    
    lines = ["Bundle Size Analysis", "=" * 40]
    
    # Sort by size
    packages.sort(key=lambda p: p.size_kb, reverse=True)
    
    critical = [p for p in packages if p.size_kb >= THRESHOLDS['critical']]
    warnings = [p for p in packages if THRESHOLDS['warning'] <= p.size_kb < THRESHOLDS['critical']]
    
    if critical:
        lines.append(f"\n🚨 CRITICAL ({len(critical)} packages):")
        for p in critical:
            lines.append(f"  {p.name}: {p.size_kb:.0f} KB")
    
    if warnings:
        lines.append(f"\n⚠️  WARNINGS ({len(warnings)} packages):")
        for p in warnings:
            lines.append(f"  {p.name}: {p.size_kb:.0f} KB")
    
    lines.append(f"\nTotal heavy packages: {len(packages)}")
    lines.append(f"Thresholds: warning={THRESHOLDS['warning']}KB, critical={THRESHOLDS['critical']}KB")
    
    return "\n".join(lines)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze bundle sizes')
    parser.add_argument('--project-dir', default='.', help='Project directory')
    parser.add_argument('--requirements', default='resume-api/requirements.txt', help='Python requirements')
    parser.add_argument('--output', help='Output file')
    
    args = parser.parse_args()
    
    packages = []
    
    # Analyze npm
    npm_packages = analyze_npm_packages(args.project_dir)
    packages.extend(npm_packages)
    
    # Analyze Python
    python_packages = analyze_python_packages(args.requirements)
    packages.extend(python_packages)
    
    report = generate_report(packages)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
    else:
        print(report)
    
    # Exit with error if critical packages found
    critical_count = len([p for p in packages if p.size_kb >= THRESHOLDS['critical']])
    return critical_count


if __name__ == '__main__':
    count = main()
    sys.exit(1 if count > 0 else 0)
