#!/bin/bash

# Worktree management for PR processing
# This script handles creating, managing, and cleaning up worktrees for PR processing

set -e

WORKTREE_BASE="/tmp/resumeai-pr-worktrees"

# Function to create a worktree for a specific PR
create_worktree_for_pr() {
    local pr_number=$1
    local branch_name=$2
    
    echo "Creating worktree for PR #$pr_number (branch: $branch_name)"
    
    local worktree_dir="$WORKTREE_BASE/pr-$pr_number"
    
    # Remove existing worktree if it exists
    if [ -d "$worktree_dir" ]; then
        echo "Removing existing worktree at $worktree_dir"
        git worktree remove -f "$worktree_dir"
    fi
    
    # Create new worktree
    git worktree add "$worktree_dir" "$branch_name"
    
    # Setup dependencies in the worktree
    cd "$worktree_dir"
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    cd - > /dev/null
    
    echo "Worktree created at $worktree_dir"
}

# Function to remove a worktree
remove_worktree_for_pr() {
    local pr_number=$1
    
    local worktree_dir="$WORKTREE_BASE/pr-$pr_number"
    
    if [ -d "$worktree_dir" ]; then
        echo "Removing worktree for PR #$pr_number"
        git worktree remove -f "$worktree_dir"
    else
        echo "No worktree found for PR #$pr_number"
    fi
}

# Function to list all PR worktrees
list_worktrees() {
    echo "Current PR worktrees:"
    ls -la "$WORKTREE_BASE" 2>/dev/null || echo "No worktrees found"
}

# Function to clean up all worktrees
cleanup_all_worktrees() {
    echo "Cleaning up all PR worktrees..."
    
    for dir in "$WORKTREE_BASE"/pr-*; do
        if [ -d "$dir" ]; then
            pr_num=$(basename "$dir" | sed 's/pr-//')
            echo "Removing worktree for PR #$pr_num"
            git worktree remove -f "$dir"
        fi
    done
    
    # Also remove the worktrees from git's knowledge
    git worktree prune
    
    echo "All worktrees cleaned up"
}

# Main execution based on command line args
case "${1:-}" in
    create)
        if [ $# -ne 3 ]; then
            echo "Usage: $0 create <pr_number> <branch_name>"
            exit 1
        fi
        create_worktree_for_pr "$2" "$3"
        ;;
    remove)
        if [ $# -ne 2 ]; then
            echo "Usage: $0 remove <pr_number>"
            exit 1
        fi
        remove_worktree_for_pr "$2"
        ;;
    list)
        list_worktrees
        ;;
    cleanup)
        cleanup_all_worktrees
        ;;
    *)
        echo "Usage: $0 {create|remove|list|cleanup}"
        echo "  create <pr_number> <branch_name> - Create a worktree for a PR"
        echo "  remove <pr_number>               - Remove a worktree for a PR"
        echo "  list                             - List all PR worktrees"
        echo "  cleanup                          - Remove all PR worktrees"
        exit 1
        ;;
esac