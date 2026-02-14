#!/bin/bash
# Script to run API integration tests

set -e  # Exit on any error

echo "Setting up environment for API integration tests..."

# Change to the worktree directory
cd /home/alexc/Projects/feature-issue-36-add-api-endpoint-integration-tests

# Install test dependencies
echo "Installing test dependencies..."
pip install -r test_requirements.txt

# Run the integration tests
echo "Running API integration tests..."
python -m pytest tests/api_integration_tests/ -v --tb=short

echo "API integration tests completed!"