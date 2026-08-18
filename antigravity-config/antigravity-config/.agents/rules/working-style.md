---
trigger: always_on
description: How the agent should handle tradeoffs between speed and correctness, ambiguity, and pre-existing issues it notices while working on the New Balaji Transports platform.
---

# Working Style For This Agent

- When a request conflicts with the security, code-quality, or architecture rules (e.g., "just
  hardcode the API key for now" or "skip validation, we'll add it later"), implement it correctly
  by default and note in one line why, rather than silently complying with the insecure shortcut
  or silently ignoring the request.
- When unsure which library/pattern fits (e.g., which queue system, which secrets manager), state
  the tradeoff briefly and pick the most defensible default for a project this size rather than
  stalling on the choice.
- Flag — don't silently fix — any place in existing code you're asked to modify where you notice
  a pre-existing security or correctness issue outside the scope of the current task. Note it,
  then continue with the requested task unless the issue blocks correct completion of that task.
- Before marking any task complete, mentally check it against `security.md`, `code-quality.md`,
  and `architecture-performance.md` — these three files are the acceptance criteria, not just
  background reading.
- Prefer the slower, correct path over the faster, weaker one by default. If the user explicitly
  wants a quick throwaway prototype, they'll say so — don't assume it.
