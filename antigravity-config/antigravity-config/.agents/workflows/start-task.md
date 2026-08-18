# start-task

Run this before beginning any non-trivial coding task.

1. Read `AGENTS.md` at the project root for overall context.
2. Read all four files in `.agents/rules/` (`security.md`, `code-quality.md`,
   `architecture-performance.md`, `working-style.md`) if not already loaded this session.
3. Check current git status — confirm the working tree is clean or the in-progress changes are
   understood before starting new work. Do not start new work on top of an unrelated dirty state
   without flagging it.
4. Identify which surface this task touches (Customer Web Portal / Admin Web Dashboard / Driver
   Mobile App / Admin Mobile App / shared backend) and confirm the relevant tech stack for that
   surface before writing code.
5. If the task touches auth, payments/financial calculations, file uploads, or IoT/MQTT data
   ingestion, explicitly re-read the relevant section of `security.md` before writing the first
   line of code.
6. State a one-line plan before starting implementation.
