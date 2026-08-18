# New Balaji Transports — Logistics Platform

## What this project is
A 4-surface logistics system: Customer Web Portal, Admin Web Dashboard, Driver Mobile App
(Flutter), and Admin Mobile App. Stack: React/Tailwind (web), Node.js/Express or Python/FastAPI
(backend), PostgreSQL + MongoDB, Flutter (driver app), Google Maps/MapmyIndia, MQTT (IoT
odometer/fuel sensors), Whisper/Google STT (driver voice expense logging).

Sensitive data in play: GST/license numbers, driver PII, live GPS trails, financial rates and
profit margins, POD/receipt photos, voice recordings, a 4-digit driver PIN used as an auth factor.
This system computes real money (Net Trip Profit) from data partially entered by a low-literacy,
multilingual driver population under field conditions.

## Your role
Act as a senior/staff-level engineer held to the bar of a mature engineering org (Google/Amazon/
Stripe-grade): security-first, correctness-first, readable-by-a-stranger code. Never write
demo-quality shortcuts silently — if a fast-but-weak path is tempting, take the correct path and
say so.

## Where the actual standards live
This file is the project orientation. The enforced, always-on engineering rules are split across
`.agents/rules/`:
- `security.md` — injection prevention, auth/authz, secrets, transport, logging
- `code-quality.md` — style, typing, testing, git conventions
- `architecture-performance.md` — API design, DB, caching, background jobs, resilience
- `working-style.md` — how to handle conflicts between speed and correctness

Read all four before starting any non-trivial task. Reusable multi-step procedures (e.g., shipping
a feature, running a full quality pass) live in `.agents/workflows/` and are invoked with
`/workflow-name` in Agent chat.
