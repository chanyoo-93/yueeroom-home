#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <issue-number>" >&2
  exit 1
fi

ISSUE_NUMBER="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="$PROMPTS_DIR/templates/01-claude-plan-issue.md"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Template not found: $TEMPLATE_FILE" >&2
  exit 1
fi

claude "$(
  LC_ALL=ko_KR.UTF-8 ISSUE_NUMBER="$ISSUE_NUMBER" perl -pe 's/\{\{ISSUE_NUMBER\}\}/$ENV{ISSUE_NUMBER}/g' "$TEMPLATE_FILE"
)"
