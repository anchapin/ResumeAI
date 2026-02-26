#!/bin/bash

# Load Testing CLI Runner for ResumeAI
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HOST="${HOST:-http://localhost:8000}"
USERS="${USERS:-100}"
SPAWN_RATE="${SPAWN_RATE:-10}"
DURATION="${DURATION:-5m}"
MODE="interactive"
OUTPUT_DIR="load-test-results"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    cat << EOF
${BLUE}ResumeAI Load Testing CLI${NC}

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --host HOST              Target API host (default: $HOST)
    -u, --users USERS            Number of concurrent users (default: $USERS)
    -r, --spawn-rate RATE        User spawn rate per second (default: $SPAWN_RATE)
    -t, --time TIME              Duration of test (e.g., 5m, 1h) (default: $DURATION)
    --headless                   Run in headless mode (no web UI)
    --help                       Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host) HOST="$2"; shift 2 ;;
        -u|--users) USERS="$2"; shift 2 ;;
        -r|--spawn-rate) SPAWN_RATE="$2"; shift 2 ;;
        -t|--time) DURATION="$2"; shift 2 ;;
        --headless) MODE="headless"; shift ;;
        --help) show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

log_info "Starting load test..."
log_info "Host: $HOST"
log_info "Users: $USERS"
log_info "Spawn Rate: $SPAWN_RATE/sec"
log_info "Duration: $DURATION"

mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="$OUTPUT_DIR/results_${TIMESTAMP}.html"
CSV_FILE="$OUTPUT_DIR/stats_${TIMESTAMP}.csv"

LOCUST_CMD="locust -f locustfile.py --host=$HOST -u $USERS -r $SPAWN_RATE -t $DURATION"

if [ "$MODE" = "headless" ]; then
    LOCUST_CMD="$LOCUST_CMD --headless --csv=$CSV_FILE --html=$RESULTS_FILE"
fi

if eval "$LOCUST_CMD"; then
    log_success "Load test completed successfully!"
    if [ "$MODE" = "headless" ]; then
        log_info "Results: $RESULTS_FILE"
    fi
else
    log_error "Load test failed"
    exit 1
fi
