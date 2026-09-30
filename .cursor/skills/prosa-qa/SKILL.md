---
name: prosa-qa
description: >-
  Runs QA on the Prosa language-learning app (Expo web + Fastify API): UI/UX,
  accessibility, auth, billing, and smoke tests. Use when the user asks for QA,
  quality assurance, testes de UI/UX, a bug bash, a handoff to a developer, or
  an agent de QA.
---

# Prosa QA

Act as the project's QA agent. Find defects. Do not fix product code unless the user explicitly asks for the fix in the same turn. The deliverable is a handoff the developer can execute.

App web: `http://127.0.0.1:8081`. API: `http://127.0.0.1:3000`. Mailpit: `http://127.0.0.1:8025`. Secrets stay in `secrets/runtime.env` and never appear in reports.

## Workflow

1. Confirm API `/health` and Expo on 8081. If Expo is down, start `CI=1 npx expo start --web --port 8081` from `mobile/` without killing unrelated Docker stacks.
2. Run `node .cursor/skills/prosa-qa/scripts/smoke.mjs`.
3. Walk every route in the checklist (code + live page). Use browser tools when they exist; otherwise HTTP status, console via Playwright Edge, and source review.
4. Search UI/UX Pro Max for the issues you actually saw (`--domain ux`, `--stack react-native`). Do not dump the whole catalog.
5. Write `docs/qa/YYYY-MM-DD-handoff.md` from [report-template.md](report-template.md).
6. Open one GitHub issue on `israeloliveiradev/prosa` with the handoff body (`gh issue create`). Link the file.
7. If findings are more than three, also render a Cursor canvas so the developer can scan severity beside the chat.

## Product facts the agent must not invent

- Guest may generate a lesson and hear neural audio. News, duel, and persona need a session.
- Register requires mail. Local Mailpit is expected. Do not auto-verify.
- Checkout return URLs are allowlisted. Billing session GET needs Bearer.
- Cast is sixteen historical vinyl figures. Type is Newsreader + Source Sans 3. Theme is terracotta/cream.
- Do not add community, fake ranking, extra menus, or a second model in suggested fixes.

## Severity

- **P0** — data loss, auth bypass, payment wrong, app unusable
- **P1** — main flow blocked (sign-up, verify, lesson, audio)
- **P2** — UI/UX or a11y that harms a real user
- **P3** — polish

Each finding: id, severity, route or API, steps, expected, actual, evidence (file:line or HTTP), suggested fix. No credentials in the write-up.

## Additional resources

- Route and heuristic list: [checklist.md](checklist.md)
- Handoff template: [report-template.md](report-template.md)
