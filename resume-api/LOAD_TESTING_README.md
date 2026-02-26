# Load Testing Guide for ResumeAI

Comprehensive guide for running and analyzing load tests.

## Quick Start

### 1. Install Locust

```bash
pip install locust>=2.25.0
```

### 2. Start API Server

```bash
python main.py
```

### 3. Run Test

```bash
# Interactive mode with web UI
locust -f locustfile.py --host=http://localhost:8000

# Headless mode
./run_load_test.sh --headless -u 100 -r 10 -t 5m
```

---

## Installation

```bash
# Using pip
pip install locust>=2.25.0

# Or add to requirements.txt
echo "locust>=2.25.0" >> requirements.txt
pip install -r requirements.txt

# Verify installation
locust --version
```

---

## Running Tests

### Using CLI Script

```bash
# Interactive mode
./run_load_test.sh

# Headless with 100 users
./run_load_test.sh --headless

# Custom parameters
./run_load_test.sh --headless -u 250 -r 25 -t 10m

# Remote server
./run_load_test.sh --host https://api.example.com --headless -u 100
```

### Using Locust Directly

```bash
# Basic test
locust -f locustfile.py --host=http://localhost:8000

# Headless with parameters
locust -f locustfile.py \
  --host=http://localhost:8000 \
  -u 100 \
  -r 10 \
  -t 5m \
  --headless \
  --csv=results

# Specific user class
locust -f locustfile.py \
  --host=http://localhost:8000 \
  ResumeAIUser
```

---

## Test Scenarios

### Scenario 1: Baseline Testing

```bash
./run_load_test.sh --headless -u 100 -r 10 -t 5m
```

Expected: All metrics within baseline targets.

### Scenario 2: Spike Testing

```bash
./run_load_test.sh --headless -u 200 -r 50 -t 10m
```

Test response to sudden traffic increase.

### Scenario 3: Endurance Testing

```bash
./run_load_test.sh --headless -u 100 -r 10 -t 1h
```

Verify stability under sustained load.

### Scenario 4: Breaking Point

```bash
for users in 100 200 500 1000; do
  ./run_load_test.sh --headless -u $users -r 10 -t 5m
done
```

Find system limits.

---

## Analyzing Results

Results are saved to `load-test-results/`:

```
load-test-results/
├── results_20240115_143022.html
├── stats_20240115_143022.csv
└── response_times_20240115_143022.csv
```

### View HTML Report

```bash
# macOS
open load-test-results/results_*.html

# Linux
xdg-open load-test-results/results_*.html

# Windows
start load-test-results/results_*.html
```

### Key Metrics

- **p50/p95/p99**: Response time percentiles
- **Requests**: Total requests sent
- **Failures**: Number of failed requests
- **Throughput**: Requests per second

Compare against [LOAD_TEST_BASELINE_METRICS.md](./LOAD_TEST_BASELINE_METRICS.md)

---

## Troubleshooting

### Cannot connect to host

```bash
# Verify API is running
curl http://localhost:8000/health

# Check port
netstat -tuln | grep 8000

# Restart API
cd resume-api && python main.py
```

### High error rate

```bash
# Check API logs
tail -100 /path/to/api.log

# Check resources
free -h && top -b -n 1 | head -10

# Reduce user count
./run_load_test.sh --headless -u 50 -r 5 -t 5m
```

### Timeout errors

```bash
# Increase timeout in locustfile.py
# Or reduce concurrent users
./run_load_test.sh --headless -u 50 -r 5 -t 5m
```

### Permission denied

```bash
chmod +x run_load_test.sh
./run_load_test.sh
```

---

## Performance Targets

### Health Check

- P95: < 100ms
- P99: < 150ms

### PDF Rendering

- P95: < 2.5s
- P99: < 3.5s

### Resume Tailoring

- P95: < 8s
- P99: < 12s

### Variant Generation

- P95: < 4s
- P99: < 6s

---

## Best Practices

1. **Before testing**: Verify API is running, check connectivity
2. **Monitor system**: Watch CPU/memory during test
3. **Run progressively**: Start light, increase gradually
4. **Document results**: Save metrics historically
5. **Archive results**: Keep load test results for comparison

---

## Capacity Planning

See [CAPACITY_PLANNING_GUIDE.md](./CAPACITY_PLANNING_GUIDE.md) for:

- Infrastructure sizing
- Cost estimates
- Scaling strategies
- Monitoring alerts

---

## References

- [Locust Documentation](https://docs.locust.io/)
- [LOAD_TEST_BASELINE_METRICS.md](./LOAD_TEST_BASELINE_METRICS.md)
- [CAPACITY_PLANNING_GUIDE.md](./CAPACITY_PLANNING_GUIDE.md)
