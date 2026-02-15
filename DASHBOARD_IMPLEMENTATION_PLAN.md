# Project Dashboard Implementation Plan

## Overview
This document outlines the implementation plan for a dashboard to visualize the status of all issues and PRs in the ResumeAI project.

## Dashboard Requirements

### 1. Data Sources
- GitHub API for PR and Issue data
- CI/CD status information
- Worktree status information

### 2. Visual Components
- Kanban-style board showing issues and PRs by status
- Progress indicators for open vs. closed items
- Status indicators for CI/CD checks
- Assignment tracking

## Implementation Options

### Option 1: Web-based Dashboard (Recommended)
Create a simple web dashboard using HTML/CSS/JS that pulls data from GitHub API:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ResumeAI Project Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        .dashboard-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #0366d6;
        }
        
        .kanban-board {
            display: flex;
            gap: 20px;
            overflow-x: auto;
            padding-bottom: 20px;
        }
        
        .column {
            min-width: 300px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
        }
        
        .column-header {
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .item {
            background: white;
            border-radius: 5px;
            padding: 12px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-left: 4px solid #0366d6;
        }
        
        .pr-item { border-left-color: #28a745; }
        .issue-item { border-left-color: #d73a49; }
        
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            margin-top: 8px;
        }
        
        .status-open { background: #e7f3ff; color: #0366d6; }
        .status-closed { background: #e6ffec; color: #28a745; }
        .status-merged { background: #e6ffec; color: #28a745; }
        .status-failed { background: #ffeaea; color: #cb2431; }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="header">
            <h1>ResumeAI Project Dashboard</h1>
            <p>Real-time status of issues, pull requests, and development progress</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="openIssues">0</div>
                <div>Open Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="openPRs">0</div>
                <div>Open PRs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="recentlyMerged">0</div>
                <div>Merged (7d)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="needsAttention">0</div>
                <div>Needs Attention</div>
            </div>
        </div>
        
        <div class="kanban-board">
            <div class="column">
                <div class="column-header">To Do (Issues)</div>
                <div id="todo-column" class="items-container">
                    <!-- Issues will be populated here -->
                </div>
            </div>
            
            <div class="column">
                <div class="column-header">In Progress (PRs)</div>
                <div id="inprogress-column" class="items-container">
                    <!-- PRs will be populated here -->
                </div>
            </div>
            
            <div class="column">
                <div class="column-header">Review</div>
                <div id="review-column" class="items-container">
                    <!-- Items awaiting review -->
                </div>
            </div>
            
            <div class="column">
                <div class="column-header">Done</div>
                <div id="done-column" class="items-container">
                    <!-- Closed/Merged items -->
                </div>
            </div>
        </div>
    </div>

    <script>
        // Configuration
        const REPO_OWNER = 'anchapin';
        const REPO_NAME = 'ResumeAI';
        const GITHUB_TOKEN = localStorage.getItem('github_token') || '';
        
        // DOM Elements
        const elements = {
            openIssues: document.getElementById('openIssues'),
            openPRs: document.getElementById('openPRs'),
            recentlyMerged: document.getElementById('recentlyMerged'),
            needsAttention: document.getElementById('needsAttention'),
            todoColumn: document.getElementById('todo-column'),
            inprogressColumn: document.getElementById('inprogress-column'),
            reviewColumn: document.getElementById('review-column'),
            doneColumn: document.getElementById('done-column')
        };
        
        // Initialize dashboard
        async function initDashboard() {
            try {
                await updateStats();
                await populateKanbanBoard();
            } catch (error) {
                console.error('Error initializing dashboard:', error);
                alert('Error loading dashboard data. Please check console for details.');
            }
        }
        
        // Update statistics
        async function updateStats() {
            // Get open issues count
            const openIssuesCount = await getOpenIssuesCount();
            elements.openIssues.textContent = openIssuesCount;
            
            // Get open PRs count
            const openPRsCount = await getOpenPRsCount();
            elements.openPRs.textContent = openPRsCount;
            
            // Get recently merged PRs count
            const recentlyMergedCount = await getRecentlyMergedCount();
            elements.recentlyMerged.textContent = recentlyMergedCount;
            
            // Get items needing attention count
            const needsAttentionCount = await getItemsNeedingAttentionCount();
            elements.needsAttention.textContent = needsAttentionCount;
        }
        
        // Populate Kanban board
        async function populateKanbanBoard() {
            // Clear existing content
            Object.values(elements).forEach(el => {
                if (el.classList.contains('items-container')) {
                    el.innerHTML = '';
                }
            });
            
            // Get issues and PRs
            const [issues, prs] = await Promise.all([
                getOpenIssues(),
                getOpenPRs()
            ]);
            
            // Categorize and display items
            issues.forEach(issue => {
                const itemEl = createItemElement(issue, 'issue');
                elements.todoColumn.appendChild(itemEl);
            });
            
            prs.forEach(pr => {
                let column;
                if (pr.state === 'open' && pr.reviewDecision === 'CHANGES_REQUESTED') {
                    column = elements.reviewColumn;
                } else if (pr.state === 'open') {
                    column = elements.inprogressColumn;
                } else {
                    column = elements.doneColumn;
                }
                
                const itemEl = createItemElement(pr, 'pr');
                column.appendChild(itemEl);
            });
        }
        
        // Helper functions
        function createItemElement(item, type) {
            const div = document.createElement('div');
            div.className = `item ${type}-item`;
            
            let statusText = '';
            if (type === 'issue') {
                statusText = `<span class="status-badge status-open">Open</span>`;
            } else { // PR
                if (item.state === 'open') {
                    if (item.reviewDecision === 'CHANGES_REQUESTED') {
                        statusText = `<span class="status-badge status-failed">Changes Req.</span>`;
                    } else {
                        statusText = `<span class="status-badge status-open">Open</span>`;
                    }
                } else {
                    statusText = `<span class="status-badge status-merged">Merged</span>`;
                }
            }
            
            div.innerHTML = `
                <strong>#${item.number}</strong><br>
                <small>${item.title}</small><br>
                <small>by ${item.user?.login || item.author?.login || 'Unknown'}</small><br>
                ${statusText}
            `;
            
            return div;
        }
        
        // API helper functions
        async function apiCall(endpoint) {
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'ResumeAI-Dashboard'
            };
            
            if (GITHUB_TOKEN) {
                headers['Authorization'] = `token ${GITHUB_TOKEN}`;
            }
            
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${endpoint}`, { headers });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            return response.json();
        }
        
        // Data retrieval functions
        async function getOpenIssues() {
            const issues = await apiCall('issues?state=open&per_page=30');
            return issues.filter(issue => !issue.pull_request); // Filter out PRs
        }
        
        async function getOpenPRs() {
            return await apiCall('pulls?state=open&per_page=30');
        }
        
        async function getOpenIssuesCount() {
            const issues = await apiCall('issues?state=open&per_page=1');
            // Since we can't get count directly, we'll make a request and estimate
            return issues.length > 0 ? 'Many' : 0;
        }
        
        async function getOpenPRsCount() {
            const prs = await apiCall('pulls?state=open&per_page=1');
            return prs.length > 0 ? 'Many' : 0;
        }
        
        async function getRecentlyMergedCount() {
            // This would require more complex filtering that GitHub API doesn't directly support
            // For demo purposes, returning a placeholder
            return 'Recent';
        }
        
        async function getItemsNeedingAttention() {
            // Get PRs with changes requested
            const prs = await getOpenPRs();
            return prs.filter(pr => pr.review_decision === 'CHANGES_REQUESTED');
        }
        
        async function getItemsNeedingAttentionCount() {
            const items = await getItemsNeedingAttention();
            return items.length;
        }
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initDashboard);
        
        // Refresh data every 5 minutes
        setInterval(initDashboard, 5 * 60 * 1000);
    </script>
</body>
</html>
```

### Option 2: Command-line Dashboard
Enhance the existing `monitor_status.sh` script to provide more visual output:

```bash
#!/bin/bash

# Enhanced dashboard script with visual indicators
# This script provides a visual summary of the project status

set -e

REPO="anchapin/ResumeAI"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================="
echo -e "RESUMEAi PROJECT DASHBOARD"
echo -e "===========================================${NC}"
echo "Date: $(date)"
echo

# Function to print a section header
print_header() {
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '%.0s-' {1..50})${NC}"
}

# Function to print a stat card
print_stat_card() {
    local title=$1
    local value=$2
    local color=${3:-$GREEN}
    printf "%-25s ${color}%6s${NC}\n" "$title:" "$value"
}

# Get stats
OPEN_ISSUES=$(gh issue list --repo "$REPO" --state open --json number 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
OPEN_PRS=$(gh pr list --repo "$REPO" --state open --json number 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
RECENTLY_MERGED=$(gh search prs --repo "$REPO" --merged since:$(date -d "7 days ago" +%Y-%m-%d) --json number 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

# Print summary stats
print_header "PROJECT SUMMARY"
print_stat_card "Open Issues" "$OPEN_ISSUES" "$RED"
print_stat_card "Open PRs" "$OPEN_PRS" "$YELLOW"
print_stat_card "Recently Merged (7d)" "$RECENTLY_MERGED" "$GREEN"
echo

# Show open PRs with status indicators
print_header "OPEN PULL REQUESTS"
PR_DATA=$(gh pr list --repo "$REPO" --state open --json number,title,state,reviewDecision,statusCheckRollup --limit 20 2>/dev/null)
if [ -n "$PR_DATA" ] && [ "$PR_DATA" != "null" ] && [ "$PR_DATA" != "[]" ]; then
    echo "$PR_DATA" | jq -r '.[] | "\(.number) - \(.title) [Status: \(.state)] [Review: \(.reviewDecision // "NONE")]"' 2>/dev/null | while read -r line; do
        if [[ $line == *"CHANGES_REQUESTED"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ $line == *"APPROVED"* ]]; then
            echo -e "${GREEN}$line${NC}"
        else
            echo "$line"
        fi
    done
else
    echo "No open PRs found."
fi
echo

# Show open issues
print_header "OPEN ISSUES"
ISSUE_DATA=$(gh issue list --repo "$REPO" --state open --json number,title,state,assignees --limit 20 2>/dev/null)
if [ -n "$ISSUE_DATA" ] && [ "$ISSUE_DATA" != "null" ] && [ "$ISSUE_DATA" != "[]" ]; then
    echo "$ISSUE_DATA" | jq -r '.[] | "#\(.number) - \(.title)"' 2>/dev/null
else
    echo "No open issues found."
fi
echo

# Show PRs needing attention
print_header "NEEDS ATTENTION"
NEEDS_ATTENTION=$(echo "$PR_DATA" | jq -r '.[] | select(.reviewDecision == "CHANGES_REQUESTED") | "\(.number) - \(.title) [CHANGES REQUESTED]"' 2>/dev/null)
if [ -n "$NEEDS_ATTENTION" ]; then
    echo -e "${RED}$NEEDS_ATTENTION${NC}"
else
    echo -e "${GREEN}No items need immediate attention.${NC}"
fi
echo

echo -e "${BLUE}==========================================="
echo -e "DASHBOARD REFRESHES EVERY 5 MINUTES${NC}"
echo -e "${BLUE}===========================================${NC}"

# Auto-refresh function
refresh_dashboard() {
    sleep 300  # Wait 5 minutes
    clear
    exec "$0"  # Re-run the script
}

# Uncomment the next line to enable auto-refresh
# refresh_dashboard
```

## Implementation Steps

1. **Choose Implementation Option**: The web-based dashboard provides better visualization and user experience
2. **Setup GitHub Token**: For API access, users need to provide a GitHub token with appropriate permissions
3. **Deploy Solution**: Host the dashboard on GitHub Pages or a simple web server
4. **Schedule Updates**: Use GitHub Actions or cron job to periodically update the dashboard data

## Benefits

- Real-time visibility into project status
- Quick identification of bottlenecks
- Better coordination among team members
- Historical tracking of progress

## Next Steps

1. Implement the chosen dashboard solution
2. Add authentication for GitHub API access
3. Create a simple setup guide for other contributors
4. Integrate with CI/CD pipeline for automatic deployment