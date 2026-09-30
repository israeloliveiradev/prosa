# Checklist

Walk these surfaces every run. Mark pass / fail / blocked.

## Routes

| Route | Guest | Signed in | Notes |
| --- | --- | --- | --- |
| `/` | start/continue, cast, topic | same + session chip | topic paywall if free + custom theme |
| `/news` | CTA to account | DailyNews | interests, level radios |
| `/practice` | links | duel + persona | |
| `/memory` | local deck | retention + history | |
| `/daily` | generate + 20 min | profile + minds in cache | reading → review → shadow → journal |
| `/duel` | bounce to account | 120s | |
| `/persona` | bounce | scenes | |
| `/paywall` | status + login CTA | checkout | confirm needs Bearer |
| `/account` | register / login / verify / 2FA / forgot | plan + links | |
| `/settings` | redirect account | tabs | |
| `/reset` | code form | | |
| `/guide` | always | | |
| `/admin` | 403 path | admin only | |
| `/quiz` | onboarding | | |

Viewports: 375×812 and 1280×800. Light and dark.

## API smoke

- `GET /health` 200, schema matches `DATABASE_SCHEMA_VERSION`
- `GET /api/v1/auth/me` without Bearer → 401
- `GET /api/v1/billing/sessions/cs_x` without Bearer → 401
- `POST` mutating with `Origin: https://evil.example` → 403
- Register empty body → 400
- Login bad password → 401, same message
- Register + Mailpit code + verify → token
- Guest `POST /api/v1/lessons/generate` with langs + level
- `GET /api/v1/audio/voices?lang=en`

## UI/UX heuristics (from ui-ux-pro-max)

- Visible label on every input (not placeholder-only)
- `autoComplete` / paste allowed on auth (WCAG 2.2)
- Errors: `role=alert` or live region, recovery path
- Touch ≥ 44px, 8px gap
- Visible focus on web; do not `outline-none` without a ring
- Contrast 4.5:1 body; dark mode checked separately
- `accessibilityLabel` on icon-only controls
- Safe area includes bottom (home indicator)
- Loading, empty, error, disabled states
- Buttons pending while in flight
- No emoji-as-icon
- Essential text wraps (no silent ellipsis on primary actions)

## Session flow

Reading audio, skip, grammar double-tap, SRS grades, shadow record, journal submit, reconstruction day 3, hands-free. Fail the run if neural audio is silent and the UI does not say so.
