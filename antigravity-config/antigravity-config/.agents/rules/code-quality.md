---
trigger: always_on
description: Code quality, typing, testing, and version-control standards for the New Balaji Transports platform. Applies to every file created or edited in this repo.
---

# Code Quality & Maintainability

## Typing & style
- TypeScript in `strict` mode for all JS/React/Node code — no implicit `any` (comment why if
  unavoidable). Full type hints + a clean mypy/pyright run for Python. Dart's sound null-safety
  fully leveraged in Flutter (no `!` non-null assertions without justification).
- Follow the established style guide per language rather than inventing one: Airbnb or Google
  TS/JS style guide (ESLint + Prettier enforced in CI, not just locally), PEP 8 + Black/Ruff for
  Python, `dart format` + `flutter analyze` (Effective Dart) for Flutter.
- Naming: descriptive, unabbreviated, intention-revealing (`calculateNetTripProfit`, not `calcNTP`
  or `doCalc`). Booleans read as questions (`isTripActive`, `hasValidPOD`). No single-letter
  variables outside tight loop indices.
- Functions do one thing. If a function needs a "step 1 / step 2 / step 3" comment to explain
  itself, split it into multiple functions. Prefer composition over deeply nested conditionals.
- No magic numbers/strings in business logic — the 14-day compliance-expiry window, PIN length,
  toll-plaza radius thresholds, etc. are named constants in one config location.
- Every module/service gets a short README (what it does, how to run it, how to test it). Every
  public function/class gets a docstring/JSDoc capturing the "why" and non-obvious constraints,
  not just restating the signature.
- Centralized, typed error handling: custom error classes/hierarchies (`ValidationError`,
  `AuthError`, `ComplianceViolationError`) caught by one central error-handling
  middleware/handler per service — never scattered try/catch blocks inventing their own response
  shape.
- Idempotency: trip creation, PDF report generation, and any financial-mutation endpoint must be
  safely retryable (idempotency key on the request) — a flaky driver-phone network should never
  create duplicate trips or double-count an expense.

## Testing
- Unit tests for all business logic, especially the financial calculations (Net Trip Profit,
  mileage, toll estimation) with edge-case coverage (zero fuel refills, missing readings,
  implausible deltas) — these are money-facing.
- Integration tests for every API endpoint: happy path, invalid input, unauthorized access,
  unauthenticated access.
- For the Driver App: explicitly test offline/flaky-network behavior (queued writes that sync on
  reconnect) — this is a field app, not an always-online consumer app.
- CI runs full lint + typecheck + test suite on every PR; merges are blocked on failure.

## Version control
- Conventional Commits format (`feat:`, `fix:`, `security:`, `refactor:`) for scannable history
  and changelog generation.
- No direct pushes to main/production branches — PR + at least one review required, with a
  checklist covering: injection risk, auth/authz check, secrets check, test coverage.
- Feature branches named by ticket/scope (`feature/driver-voice-expense`, not `fix2` or `temp`).
