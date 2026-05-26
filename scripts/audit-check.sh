#!/usr/bin/env bash
set -euo pipefail

EXCEPTIONS_FILE=".audit-exceptions"

if [[ ! -f "$EXCEPTIONS_FILE" ]]; then
  echo "Missing $EXCEPTIONS_FILE" >&2
  exit 1
fi

IDS=()
while IFS= read -r id; do
  IDS+=("$id")
done < <(
  sed 's/[[:space:]]#.*$//' "$EXCEPTIONS_FILE" |
    sed '/^[[:space:]]*#/d' |
    sed '/^[[:space:]]*$/d'
)

AUDIT_REPORT="$(mktemp)"
trap 'rm -f "$AUDIT_REPORT"' EXIT

AUDIT_STATUS=0
pnpm audit --prod --audit-level=high --json --ignore-registry-errors >"$AUDIT_REPORT" || AUDIT_STATUS=$?

if ! jq empty "$AUDIT_REPORT" >/dev/null 2>&1; then
  cat "$AUDIT_REPORT" >&2
  exit "$AUDIT_STATUS"
fi

if jq -e '.error?' "$AUDIT_REPORT" >/dev/null; then
  jq -r '"Audit registry error ignored: \(.error.message)"' "$AUDIT_REPORT"
  exit 0
fi

UNHANDLED="$(
  jq -r --rawfile exceptions "$EXCEPTIONS_FILE" '
    def exception_ids:
      $exceptions
      | split("\n")
      | map(sub("[[:space:]]+#.*$"; ""))
      | map(gsub("^[[:space:]]+|[[:space:]]+$"; ""))
      | map(select(. != "" and (startswith("#") | not)));

    [ .advisories[]?
      | select((.severity == "high" or .severity == "critical")
        and ((.github_advisory_id as $id | exception_ids | index($id)) | not))
      | "- \(.github_advisory_id) \(.module_name): \(.title)"
    ]
    | .[]
  ' "$AUDIT_REPORT"
)"

if [[ -n "$UNHANDLED" ]]; then
  echo "Unhandled high or critical advisories found:" >&2
  echo "$UNHANDLED" >&2
  exit 1
fi

echo "${#IDS[@]} high or critical advisories are covered by $EXCEPTIONS_FILE."
