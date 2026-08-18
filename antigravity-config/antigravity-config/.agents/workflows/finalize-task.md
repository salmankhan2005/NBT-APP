# finalize-task

Run this before declaring any task/PR complete.

1. **Lint & typecheck**: run the project's linter and type checker (ESLint+tsc / Ruff+mypy or
   pyright / `flutter analyze`) and fix all failures — do not leave suppressed warnings without
   a one-line justification comment.
2. **Tests**: run the full test suite for any package touched. For new business logic (especially
   anything touching Net Trip Profit, mileage, toll, or compliance-expiry calculations), confirm
   new unit tests exist covering at least one edge case, not just the happy path.
3. **Security self-check** against `.agents/rules/security.md`:
   - Any new user input validated at the boundary with a schema?
   - Any new DB query parameterized (no string-built SQL/Mongo queries)?
   - Any new endpoint checking role/ownership server-side, not just gated by frontend UI?
   - Any new secret pulled from env/secrets manager, never hardcoded or logged?
   - Any new file upload validated by content, size-capped, stored outside a web-servable path?
4. **Diff review**: read your own diff top to bottom as if reviewing a stranger's PR. Remove
   leftover debug logging, commented-out code, and TODOs that should actually be resolved now.
5. **Commit message**: Conventional Commits format, one-line summary + short body explaining the
   "why" for anything non-obvious.
6. Report back: what changed, what was tested, and any item flagged but deliberately left for a
   separate task (with a one-line reason).
