#!/usr/bin/env python3
"""
Tech Debt Management Script

A command-line tool to manage technical debt items in tech_debt.json.

Usage:
    python scripts/manage_tech_debt.py list                # List all tech debt items
    python scripts/manage_tech_debt.py add                  # Add a new tech debt item
    python scripts/manage_tech_debt.py update <id>         # Update a tech debt item
    python scripts/manage_tech_debt.py remove <id>         # Remove a tech debt item
    python scripts/manage_tech_debt.py summary             # Show tech debt summary
    python scripts/manage_tech_debt.py validate             # Validate tech_debt.json
"""

import json
import sys
import os
from datetime import datetime
from typing import Optional

TECH_DEBT_FILE = "tech_debt.json"


def load_tech_debt() -> dict:
    """Load the tech debt data from JSON file."""
    if not os.path.exists(TECH_DEBT_FILE):
        print(f"Error: {TECH_DEBT_FILE} not found!")
        sys.exit(1)
    
    with open(TECH_DEBT_FILE, 'r') as f:
        return json.load(f)


def save_tech_debt(data: dict) -> None:
    """Save the tech debt data to JSON file."""
    with open(TECH_DEBT_FILE, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')  # Add trailing newline


def get_next_id(data: dict) -> str:
    """Generate the next available ID for a new debt item."""
    items = data.get('debtItems', [])
    if not items:
        return "TD-001"
    
    max_num = 0
    for item in items:
        item_id = item.get('id', '')
        if item_id.startswith('TD-'):
            try:
                num = int(item_id.split('-')[1])
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass
    
    return f"TD-{max_num + 1:03d}"


def validate_tech_debt(data: dict) -> bool:
    """Validate the tech debt JSON structure."""
    required_fields = ['version', 'description', 'categories', 'priorities', 'statuses', 'debtItems']
    
    for field in required_fields:
        if field not in data:
            print(f"Error: Missing required field '{field}'")
            return False
    
    valid_categories = list(data['categories'].keys())
    valid_priorities = list(data['priorities'].keys())
    valid_statuses = list(data['statuses'].keys())
    
    for item in data['debtItems']:
        # Check required fields for each item
        item_required = ['id', 'title', 'description', 'category', 'priority', 'status', 'dateIdentified']
        for field in item_required:
            if field not in item:
                print(f"Error: Missing required field '{field}' in item {item.get('id', 'unknown')}")
                return False
        
        # Validate category
        if item['category'] not in valid_categories:
            print(f"Error: Invalid category '{item['category']}' in {item['id']}")
            return False
        
        # Validate priority
        if item['priority'] not in valid_priorities:
            print(f"Error: Invalid priority '{item['priority']}' in {item['id']}")
            return False
        
        # Validate status
        if item['status'] not in valid_statuses:
            print(f"Error: Invalid status '{item['status']}' in {item['id']}")
            return False
    
    print("✓ Tech debt JSON is valid!")
    return True


def list_debt(data: dict) -> None:
    """List all tech debt items."""
    items = data.get('debtItems', [])
    
    if not items:
        print("No tech debt items found.")
        return
    
    print(f"\n{'ID':<10} {'Title':<45} {'Category':<15} {'Priority':<10} {'Status':<12}")
    print("-" * 100)
    
    for item in items:
        print(f"{item.get('id', ''):<10} {item.get('title', '')[:43]:<45} {item.get('category', ''):<15} {item.get('priority', ''):<10} {item.get('status', ''):<12}")
    
    print(f"\nTotal items: {len(items)}")


def show_summary(data: dict) -> None:
    """Show a summary of tech debt items."""
    items = data.get('debtItems', [])
    
    # Status counts
    statuses = {s: 0 for s in data['statuses'].keys()}
    for item in items:
        status = item.get('status', 'identified')
        if status in statuses:
            statuses[status] += 1
    
    # Priority counts
    priorities = {p: 0 for p in data['priorities'].keys()}
    for item in items:
        priority = item.get('priority', 'low')
        if priority in priorities:
            priorities[priority] += 1
    
    # Category counts
    categories = {c: 0 for c in data['categories'].keys()}
    for item in items:
        category = item.get('category', 'code_quality')
        if category in categories:
            categories[category] += 1
    
    print("\n=== Tech Debt Summary ===\n")
    print("Status:")
    for status, count in sorted(statuses.items(), key=lambda x: x[0], reverse=True):
        print(f"  {status}: {count}")
    
    print("\nPriority:")
    priority_order = ['critical', 'high', 'medium', 'low']
    for priority in priority_order:
        if priority in priorities:
            print(f"  {priority}: {priorities[priority]}")
    
    print("\nBy Category:")
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: {count}")
    
    print(f"\nTotal items: {len(items)}")


def add_debt(data: dict) -> None:
    """Add a new tech debt item."""
    print("\n=== Add New Tech Debt Item ===\n")
    
    new_item = {}
    new_item['id'] = get_next_id(data)
    
    new_item['title'] = input("Title: ").strip()
    new_item['description'] = input("Description: ").strip()
    
    print("\nCategories:")
    for i, cat in enumerate(data['categories'].keys(), 1):
        print(f"  {i}. {cat}")
    
    cat_choice = int(input("Category (number): ")) - 1
    new_item['category'] = list(data['categories'].keys())[cat_choice]
    
    print("\nPriorities:")
    for i, pri in enumerate(data['priorities'].keys(), 1):
        print(f"  {i}. {pri}")
    
    pri_choice = int(input("Priority (number): ")) - 1
    new_item['priority'] = list(data['priorities'].keys())[pri_choice]
    
    print("\nStatuses:")
    for i, status in enumerate(data['statuses'].keys(), 1):
        print(f"  {i}. {status}")
    
    status_choice = int(input("Status (number): ")) - 1
    new_item['status'] = list(data['statuses'].keys())[status_choice]
    
    new_item['dateIdentified'] = datetime.now().strftime('%Y-%m-%d')
    
    new_item['issueReference'] = input("Issue Reference (optional): ").strip()
    if not new_item['issueReference']:
        del new_item['issueReference']
    
    new_item['affectedFiles'] = input("Affected Files (comma-separated, optional): ").strip()
    if new_item['affectedFiles']:
        new_item['affectedFiles'] = [f.strip() for f in new_item['affectedFiles'].split(',')]
    else:
        new_item['affectedFiles'] = []
    
    new_item['estimatedEffort'] = input("Estimated Effort (e.g., '2 hours'): ").strip()
    if not new_item['estimatedEffort']:
        del new_item['estimatedEffort']
    
    new_item['reporter'] = input("Reporter: ").strip()
    if not new_item['reporter']:
        del new_item['reporter']
    
    data['debtItems'].append(new_item)
    data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')
    
    save_tech_debt(data)
    print(f"\n✓ Added new tech debt item: {new_item['id']}")


def update_debt(data: dict, item_id: str) -> None:
    """Update an existing tech debt item."""
    items = data.get('debtItems', [])
    
    for i, item in enumerate(items):
        if item.get('id') == item_id:
            print(f"\n=== Update Tech Debt Item: {item_id} ===\n")
            print("Press Enter to keep current value, or type new value.\n")
            
            # Title
            current = item.get('title', '')
            new_val = input(f"Title [{current}]: ").strip()
            if new_val:
                items[i]['title'] = new_val
            
            # Description
            current = item.get('description', '')
            new_val = input(f"Description [{current[:50]}...]: ").strip()
            if new_val:
                items[i]['description'] = new_val
            
            # Category
            print("\nCategories:")
            for j, cat in enumerate(data['categories'].keys(), 1):
                marker = " (current)" if cat == item.get('category') else ""
                print(f"  {j}. {cat}{marker}")
            cat_choice = input("Category (number): ").strip()
            if cat_choice:
                items[i]['category'] = list(data['categories'].keys())[int(cat_choice) - 1]
            
            # Priority
            print("\nPriorities:")
            for j, pri in enumerate(data['priorities'].keys(), 1):
                marker = " (current)" if pri == item.get('priority') else ""
                print(f"  {j}. {pri}{marker}")
            pri_choice = input("Priority (number): ").strip()
            if pri_choice:
                items[i]['priority'] = list(data['priorities'].keys())[int(pri_choice) - 1]
            
            # Status
            print("\nStatuses:")
            for j, status in enumerate(data['statuses'].keys(), 1):
                marker = " (current)" if status == item.get('status') else ""
                print(f"  {j}. {status}{marker}")
            status_choice = input("Status (number): ").strip()
            if status_choice:
                items[i]['status'] = list(data['statuses'].keys())[int(status_choice) - 1]
                if items[i]['status'] == 'resolved':
                    items[i]['dateResolved'] = datetime.now().strftime('%Y-%m-%d')
            
            # Issue Reference
            current = item.get('issueReference', '')
            new_val = input(f"Issue Reference [{current}]: ").strip()
            if new_val:
                items[i]['issueReference'] = new_val
            elif current and not new_val:
                del items[i]['issueReference']
            
            # Estimated Effort
            current = item.get('estimatedEffort', '')
            new_val = input(f"Estimated Effort [{current}]: ").strip()
            if new_val:
                items[i]['estimatedEffort'] = new_val
            elif current and not new_val:
                del items[i]['estimatedEffort']
            
            data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')
            save_tech_debt(data)
            print(f"\n✓ Updated tech debt item: {item_id}")
            return
    
    print(f"Error: Tech debt item {item_id} not found")


def remove_debt(data: dict, item_id: str) -> None:
    """Remove a tech debt item."""
    items = data.get('debtItems', [])
    
    for i, item in enumerate(items):
        if item.get('id') == item_id:
            confirm = input(f"Delete tech debt item {item_id}? (y/N): ").strip().lower()
            if confirm == 'y':
                del items[i]
                data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')
                save_tech_debt(data)
                print(f"✓ Removed tech debt item: {item_id}")
            return
    
    print(f"Error: Tech debt item {item_id} not found")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'validate':
        data = load_tech_debt()
        validate_tech_debt(data)
    elif command == 'list':
        data = load_tech_debt()
        list_debt(data)
    elif command == 'summary':
        data = load_tech_debt()
        show_summary(data)
    elif command == 'add':
        data = load_tech_debt()
        add_debt(data)
    elif command == 'update':
        if len(sys.argv) < 3:
            print("Error: Please provide the ID of the item to update")
            sys.exit(1)
        data = load_tech_debt()
        update_debt(data, sys.argv[2])
    elif command == 'remove':
        if len(sys.argv) < 3:
            print("Error: Please provide the ID of the item to remove")
            sys.exit(1)
        data = load_tech_debt()
        remove_debt(data, sys.argv[2])
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()
