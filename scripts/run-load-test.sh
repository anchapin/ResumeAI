#!/bin/bash

# Load Testing Runner for ResumeAI
# Usage: ./scripts/run-load-test.sh [hostname] [duration]
#
# Examples:
#   ./scripts/run-load-test.sh http://localhost:8000 5m
#   ./scripts/run-load-test.sh https://api.resumeai.com 10m

set -e

HOST="${1:-http://localhost:8000}"
DURATION="${2:-5m}"
USERS=100
RAMP_RATE=10
RESULTS_DIR="benchmarks/load-tests"

echo "🔥 Starting ResumeAI Load Test"
echo "───────────────────────────────────────────"
echo "Host: $HOST"
echo "Users: $USERS"
echo "Ramp-up rate: $RAMP_RATE users/sec"
echo "Duration: $DURATION"
echo "Results dir: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Generate timestamp for results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="$RESULTS_DIR/load-test-$TIMESTAMP"

# Run load test
echo "Starting load test..."
locust -f scripts/locustfile.py \
  --host="$HOST" \
  --headless \
  -u "$USERS" \
  -r "$RAMP_RATE" \
  -t "$DURATION" \
  --csv="$RESULTS_FILE" \
  --loglevel INFO

echo ""
echo "✅ Load test completed"
echo ""
echo "📊 Results:"
echo "───────────────────────────────────────────"
echo "Stats saved to: ${RESULTS_FILE}_stats.csv"
echo ""

# Display summary
if [ -f "${RESULTS_FILE}_stats.csv" ]; then
  echo "Summary Statistics:"
  echo ""
  head -20 "${RESULTS_FILE}_stats.csv" | column -t -s','
  echo ""
  echo "Full results available in $RESULTS_DIR/"
fi

echo ""
echo "💡 Tips:"
echo "  - Review CSV files for detailed metrics"
echo "  - Compare with PERFORMANCE_BASELINES.md"
echo "  - Check API logs for errors/timeouts"
