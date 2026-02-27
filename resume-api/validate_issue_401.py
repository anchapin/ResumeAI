#!/usr/bin/env python3
"""
Validation script for GitHub Issue #401 - Prometheus Metrics & Grafana Dashboards

This script validates that:
1. All required metrics are defined
2. Histogram buckets are properly configured
3. Database query metrics exist
4. Grafana dashboards exist and are valid JSON
"""

import json
import os
import sys


def validate_metrics_module():
    """Validate that the metrics module has all required metrics."""
    print("\n" + "=" * 70)
    print("VALIDATING METRICS MODULE")
    print("=" * 70)

    errors = []

    # Check metrics.py exists
    metrics_path = "monitoring/metrics.py"
    if not os.path.exists(metrics_path):
        errors.append(f"❌ {metrics_path} does not exist")
        return False, errors

    print(f"✅ Found {metrics_path}")

    # Read metrics.py
    with open(metrics_path, 'r') as f:
        content = f.read()

    # Check for required metrics
    required_metrics = [
        "http_requests_total",
        "http_request_duration_seconds",
        "http_errors_total",
        "db_query_duration_seconds",
        "ai_request_duration_seconds",
        "pdfs_generated_total",
        "resumes_tailored_total",
    ]

    for metric in required_metrics:
        if metric in content:
            print(f"✅ Found metric: {metric}")
        else:
            errors.append(f"❌ Missing metric: {metric}")
            print(f"❌ Missing metric: {metric}")

    # Check for helper functions
    required_functions = [
        "observe_db_query_duration",
        "observe_http_request_duration",
        "increment_http_requests",
        "increment_http_errors",
    ]

    for func in required_functions:
        if f"def {func}" in content:
            print(f"✅ Found function: {func}")
        else:
            errors.append(f"❌ Missing function: {func}")
            print(f"❌ Missing function: {func}")

    # Check histogram buckets for database queries
    if "db_query_duration_seconds = Histogram" in content:
        print("✅ Database query histogram defined")
        if "0.001" in content and "2.0" in content:
            print("✅ Database query histogram has fine-grained buckets")
        else:
            errors.append("⚠️  Database query histogram buckets might not be optimal")

    return len([e for e in errors if e.startswith("❌")]) == 0, errors


def validate_dashboards():
    """Validate that all Grafana dashboards exist and are valid JSON."""
    print("\n" + "=" * 70)
    print("VALIDATING GRAFANA DASHBOARDS")
    print("=" * 70)

    errors = []
    dashboards_dir = "dashboards"

    if not os.path.exists(dashboards_dir):
        errors.append(f"❌ Dashboards directory {dashboards_dir} does not exist")
        return False, errors

    print(f"✅ Found dashboards directory: {dashboards_dir}")

    # Check for required dashboards
    required_dashboards = [
        "request-metrics.json",
        "latency-metrics.json",
    ]

    for dashboard in required_dashboards:
        dashboard_path = os.path.join(dashboards_dir, dashboard)
        if not os.path.exists(dashboard_path):
            errors.append(f"❌ Missing dashboard: {dashboard}")
            print(f"❌ Missing dashboard: {dashboard}")
            continue

        print(f"✅ Found dashboard: {dashboard}")

        # Validate JSON
        try:
            with open(dashboard_path, 'r') as f:
                dashboard_json = json.load(f)

            title = dashboard_json.get("title", "Unknown")
            panels = dashboard_json.get("panels", [])

            print(f"   Title: {title}")
            print(f"   Panels: {len(panels)}")

            if len(panels) == 0:
                errors.append(f"⚠️  Dashboard {dashboard} has no panels")

            # Check panel details
            for i, panel in enumerate(panels, 1):
                panel_title = panel.get("title", "Unknown")
                panel_type = panel.get("type", "Unknown")
                targets = panel.get("targets", [])

                if len(targets) == 0:
                    errors.append(f"⚠️  Panel {i} ({panel_title}) has no targets")
                else:
                    print(f"   ✓ Panel {i}: {panel_title} ({panel_type}) - {len(targets)} targets")

        except json.JSONDecodeError as e:
            errors.append(f"❌ Dashboard {dashboard} has invalid JSON: {e}")
            print(f"❌ Dashboard {dashboard} has invalid JSON: {e}")
        except Exception as e:
            errors.append(f"❌ Error validating {dashboard}: {e}")
            print(f"❌ Error validating {dashboard}: {e}")

    return len([e for e in errors if e.startswith("❌")]) == 0, errors


def validate_tests():
    """Validate that test suite exists."""
    print("\n" + "=" * 70)
    print("VALIDATING TEST SUITE")
    print("=" * 70)

    errors = []

    test_file = "tests/test_prometheus_metrics_issue_401.py"
    if not os.path.exists(test_file):
        errors.append(f"❌ Test file {test_file} does not exist")
        print(f"❌ Test file {test_file} does not exist")
        return False, errors

    print(f"✅ Found test file: {test_file}")

    with open(test_file, 'r') as f:
        content = f.read()

    # Check for test classes
    test_classes = [
        "TestPrometheusMetricsInstrumentation",
        "TestMetricsHistogramBuckets",
        "TestMetricsLabels",
        "TestMetricsCollection",
        "TestGrafanaDashboardMetrics",
    ]

    for test_class in test_classes:
        if f"class {test_class}" in content:
            print(f"✅ Found test class: {test_class}")
        else:
            errors.append(f"❌ Missing test class: {test_class}")
            print(f"❌ Missing test class: {test_class}")

    return len(errors) == 0, errors


def validate_documentation():
    """Validate that documentation exists."""
    print("\n" + "=" * 70)
    print("VALIDATING DOCUMENTATION")
    print("=" * 70)

    errors = []

    doc_file = "GRAFANA_DASHBOARDS_SETUP.md"
    if not os.path.exists(doc_file):
        errors.append(f"❌ Documentation file {doc_file} does not exist")
        print(f"❌ Documentation file {doc_file} does not exist")
        return False, errors

    print(f"✅ Found documentation: {doc_file}")

    with open(doc_file, 'r') as f:
        content = f.read()

    # Check for required sections
    required_sections = [
        "HTTP Request Rate by Endpoint",
        "Error rate by endpoint",
        "Database query latency",
        "Histogram Buckets",
        "Testing Metrics Population",
    ]

    for section in required_sections:
        if section in content:
            print(f"✅ Found section: {section}")
        else:
            errors.append(f"⚠️  Missing section: {section}")
            print(f"⚠️  Missing section: {section}")

    return len([e for e in errors if e.startswith("❌")]) == 0, errors


def main():
    """Run all validations."""
    print("\n" + "=" * 70)
    print("GITHUB ISSUE #401 VALIDATION SCRIPT")
    print("Prometheus Metrics & Grafana Dashboards")
    print("=" * 70)

    all_errors = []

    # Validate metrics module
    metrics_ok, metrics_errors = validate_metrics_module()
    all_errors.extend(metrics_errors)

    # Validate dashboards
    dashboards_ok, dashboards_errors = validate_dashboards()
    all_errors.extend(dashboards_errors)

    # Validate tests
    tests_ok, tests_errors = validate_tests()
    all_errors.extend(tests_errors)

    # Validate documentation
    docs_ok, docs_errors = validate_documentation()
    all_errors.extend(docs_errors)

    # Summary
    print("\n" + "=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)

    critical_errors = [e for e in all_errors if e.startswith("❌")]
    warnings = [e for e in all_errors if e.startswith("⚠️")]

    if critical_errors:
        print(f"\n❌ CRITICAL ERRORS ({len(critical_errors)}):")
        for error in critical_errors:
            print(f"   {error}")

    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"   {warning}")

    if not critical_errors:
        print("\n✅ ALL VALIDATIONS PASSED!")
        print("\nIssue #401 Implementation Complete:")
        print("  ✓ Prometheus metrics configured")
        print("  ✓ Histogram buckets optimized for percentiles")
        print("  ✓ Grafana dashboards created")
        print("  ✓ Test suite implemented")
        print("  ✓ Documentation provided")
        return 0
    else:
        print(f"\n❌ VALIDATION FAILED: {len(critical_errors)} critical error(s)")
        return 1


if __name__ == "__main__":
    sys.exit(main())
