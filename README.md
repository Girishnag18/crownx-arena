# CrownX Arena

CrownX Arena is a professional competitive platform starter built with React, TypeScript, Tailwind, and Supabase.

## Included platform modules

- Authentication: email/password, Google OAuth, email verification flow, OTP reset flow, persistent sessions, global logout.
- Role-based access control: player, moderator, admin guarded routes.
- Profile system: username, avatar, bio, rank tier, ELO score, win/loss, online status foundations.
- Matchmaking and realtime schema support for 15-second acceptance windows and live state updates.
- Leaderboards: global style ladder UI with search and animated transitions.
- Admin dashboard foundation for moderation and analytics controls.
- Modern UI/UX: dark/light mode, glassmorphism cards, responsive sections, motion interactions.
- Production readiness: PWA manifest + service worker, CI workflow, unit tests.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

## Supabase

Apply migrations in `supabase/migrations` to provision schemas for profiles, matchmaking matches, achievements, and moderation reports.
