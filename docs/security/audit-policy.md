# Dependency Audit Policy

## CI failure threshold

CI runs `pnpm audit --prod --audit-level=high` through `scripts/audit-check.sh`.
High and critical production dependency advisories fail CI unless the advisory is explicitly listed in `.audit-exceptions`.

Moderate, low, and info advisories are monitored but do not block CI in Issue #161.

## Exception process

Only existing, reviewed advisories may be added to `.audit-exceptions`.
Each exception must include:

- The GHSA ID.
- A nearby comment explaining the affected package path.
- A reason the dependency cannot be upgraded immediately.

Adding or keeping an exception requires PR review.

## Removing exceptions

Remove an exception when the direct or transitive dependency path is patched and `pnpm audit --prod --audit-level=high` no longer reports the advisory.

When removing an exception:

1. Update `.audit-exceptions`.
2. Run `bash scripts/audit-check.sh`.
3. Confirm CI still reports the `Security Audit` job.

## Review cadence

Review `.audit-exceptions` manually once per month by running `pnpm audit --prod` and checking whether upstream packages have released patched versions.
