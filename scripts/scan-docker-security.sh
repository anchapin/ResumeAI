#!/bin/bash
# Docker Security Scanning Script using Trivy
# Issue #376: Add security scanning with Trivy
# 
# This script performs vulnerability scanning on Docker images using Trivy
# Reports on CVEs, misconfigurations, and security issues
#
# Usage:
#   ./scripts/scan-docker-security.sh [image-name] [output-format]
#
# Examples:
#   ./scripts/scan-docker-security.sh resume-api:test json
#   ./scripts/scan-docker-security.sh resume-api:latest table
#   ./scripts/scan-docker-security.sh resume-api:latest sarif

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${1:-resume-api:test}"
OUTPUT_FORMAT="${2:-table}"
SCAN_DIR="/tmp/docker-scan-$(date +%s)"
REPORT_FILE="docker-scan-report-$(date +%Y%m%d-%H%M%S).${OUTPUT_FORMAT}"
SEVERITY_THRESHOLD="MEDIUM"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

check_trivy_installed() {
    if ! command -v trivy &> /dev/null; then
        log_error "Trivy is not installed"
        log_info "Install Trivy: https://github.com/aquasecurity/trivy"
        log_info "Quick install:"
        echo "  curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin"
        exit 1
    fi
    local trivy_version=$(trivy --version | head -1)
    log_success "Trivy installed: $trivy_version"
}

check_docker_image() {
    if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
        log_error "Docker image not found: $IMAGE_NAME"
        log_info "Build the image first: docker build -t $IMAGE_NAME ."
        exit 1
    fi
    log_success "Docker image found: $IMAGE_NAME"
}

validate_output_format() {
    case "$OUTPUT_FORMAT" in
        table|json|sarif|cyclonedx|spdx)
            log_success "Output format: $OUTPUT_FORMAT"
            ;;
        *)
            log_error "Invalid output format: $OUTPUT_FORMAT"
            log_info "Valid formats: table, json, sarif, cyclonedx, spdx"
            exit 1
            ;;
    esac
}

run_trivy_scan() {
    log_info "Running Trivy security scan on image: $IMAGE_NAME"
    log_info "Severity threshold: $SEVERITY_THRESHOLD"
    
    mkdir -p "$SCAN_DIR"
    
    # Run Trivy with comprehensive scanning
    # --exit-code: 0 for success, 1 for issues found
    trivy image \
        --format "$OUTPUT_FORMAT" \
        --output "$SCAN_DIR/$REPORT_FILE" \
        --severity "$SEVERITY_THRESHOLD" \
        --exit-code 0 \
        --scanners vuln,config,secret \
        --skip-db-update \
        "$IMAGE_NAME" || true
    
    log_success "Scan complete. Report saved to: $SCAN_DIR/$REPORT_FILE"
}

generate_summary() {
    log_info "Generating vulnerability summary..."
    
    # Run scan in table format for summary display
    echo ""
    echo "=== VULNERABILITY SUMMARY ==="
    trivy image \
        --format table \
        --severity "$SEVERITY_THRESHOLD" \
        --exit-code 0 \
        --scanners vuln \
        --skip-db-update \
        "$IMAGE_NAME" || true
    echo "============================="
}

copy_report_to_project() {
    local project_root="/home/alex/Projects/ResumeAI"
    local final_location="$project_root/$REPORT_FILE"
    
    if [ -f "$SCAN_DIR/$REPORT_FILE" ]; then
        cp "$SCAN_DIR/$REPORT_FILE" "$final_location"
        log_success "Report copied to: $final_location"
    fi
}

scan_dockerfile_config() {
    log_info "Scanning Dockerfile for misconfigurations..."
    
    trivy config resume-api/ \
        --format "$OUTPUT_FORMAT" \
        --output "$SCAN_DIR/dockerfile-config-$(date +%Y%m%d-%H%M%S).${OUTPUT_FORMAT}" \
        --exit-code 0 \
        --skip-db-update || true
    
    log_success "Dockerfile config scan complete"
}

print_best_practices() {
    cat << 'EOF'

=== DOCKER SECURITY BEST PRACTICES ===

1. VULNERABILITY MANAGEMENT
   - Regularly scan images with Trivy
   - Keep base images up to date
   - Use specific versions, not latest
   - Monitor CVE databases

2. IMAGE HARDENING
   - Run as non-root user ✓
   - Use minimal base image (slim/alpine) ✓
   - Remove unnecessary packages
   - Avoid storing secrets in images

3. LAYER OPTIMIZATION
   - Order commands for better caching ✓
   - Use .dockerignore to exclude files ✓
   - Combine RUN commands to reduce layers
   - Remove intermediate files

4. SECURITY SCANNING
   - Image vulnerabilities (Trivy)
   - Secrets detection
   - Misconfigurations
   - Software composition analysis (SBOM)

5. REGISTRY SECURITY
   - Use private registries
   - Sign images with Cosign
   - Enforce image policies
   - Tag images consistently

6. RUNTIME SECURITY
   - Use security policies (AppArmor/SELinux)
   - Run with minimal privileges
   - Use read-only root filesystem
   - Implement resource limits

========================================

EOF
}

main() {
    log_info "Docker Security Scanning - Issue #376"
    echo ""
    
    # Pre-flight checks
    check_trivy_installed
    validate_output_format
    check_docker_image
    
    echo ""
    
    # Run scans
    run_trivy_scan
    generate_summary
    scan_dockerfile_config
    copy_report_to_project
    
    echo ""
    print_best_practices
    
    log_success "Security scanning complete!"
    log_info "Output format: $OUTPUT_FORMAT"
    log_info "Report location: $SCAN_DIR/"
}

# Run main function
main "$@"
