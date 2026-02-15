#!/bin/bash
for branch in "bolt-debounce-autosave-16990669801344364892" "bolt/parallelize-generate-package-6408255484865937984" "feature/issue-13" "feature/issue-30" "feature/issue-40" "palette-sidebar-accessibility-9711730247743216349" "palette-ux-delete-confirmation-8168869856025993116" "pr/issue-64-v3" "temp-branch" "temp-branch-59"; do
    echo "=== $branch ===" 
    git log origin/main..origin/$branch --oneline 2>/dev/null | head -3 || echo "Branch not on remote or error"
done
