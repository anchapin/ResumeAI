#!/bin/bash
# Load Testing Runner Script
# Usage: ./benchmarks/run_load_test.sh [users] [spawn_rate] [duration]

set -e

USERS=${1:-100}
SPAWN_RATE=${2:-10}
DURATION=${3:-60s}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="benchmarks/results_${TIMESTAMP}"

echo "🚀 Starting load test..."
echo "  Users: $USERS"
echo "  Spawn rate: $SPAWN_RATE/sec"
echo "  Duration: $DURATION"
echo "  Output: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

# Run Locust
locust -f benchmarks/locustfile.py \
  --headless \
  -u "$USERS" \
  -r "$SPAWN_RATE" \
  -t "$DURATION" \
  --csv="${OUTPUT_DIR}/results" \
  --host="http://localhost:8000"

echo "✅ Load test completed!"
echo ""
echo "Results saved to: $OUTPUT_DIR"
echo "  - results_stats.csv: Endpoint statistics"
echo "  - results_failures.csv: Failed requests"
echo "  - results_stats_history.csv: Time-series data"

# Display summary
echo ""
echo "📊 Summary:"
if [ -f "${OUTPUT_DIR}/results_stats.csv" ]; then
  head -5 "${OUTPUT_DIR}/results_stats.csv"
fi
