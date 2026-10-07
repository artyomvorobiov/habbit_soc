# Streakmates — notes for AI assistants and contributors

Social habit tracker: Expo (React Native, TypeScript) app + Supabase (Postgres) backend.

## Layout

- `src/app/` — screens (Expo Router, file-based). `(app)/` is the signed-in area, `(app)/(tabs)/` the four tabs.
- `src/components/` — UI building blocks (`ui.tsx` has the design primitives).
- `src/lib/` — data and logic: `api.ts` (Supabase calls), `queries.ts` (React Query hooks),
  `streaks.ts` / `dates.ts` (pure logic, unit-tested), `i18n.ts` (all user-facing text, en + ru),
  `notifications.ts` (local reminders), `push.ts` (push tokens), `photos.ts` (pick, compress,
  upload, signed links), `realtime.ts` (live chat/notifications), `recap.ts` (weekly recap),
  `config.ts` (app name, links).
- `supabase/schema.sql` — the whole database: tables, Row Level Security, SQL functions (RPC).
  It is idempotent; users paste it into the Supabase SQL editor.
- `supabase/tests/` — runs the schema and behavioural tests on a local Postgres
  (`supabase_stub.sql` stands in for Supabase auth, storage, pg_net and realtime).
- Photos are private: `storage.objects` access follows the check-in or chat message that
  uses the photo (`can_view_photo()`); the app shows them through signed URLs.

## Rules

- All user-facing strings go through `t()` in `src/lib/i18n.ts`; add both `en` and `ru`.
- Privacy is enforced in the database (RLS). When adding a table, enable RLS, add policies
  and explicit grants in `schema.sql`, and cover it in `supabase/tests/test_schema.sql`.
- Streak rules live in two places that must stay in sync: `src/lib/streaks.ts` and
  `habit_current_streak()` in `schema.sql`.
- Use `npx expo install <pkg>` for dependencies (SDK-compatible versions).

## Checks

```bash
npm run typecheck     # tsc
npm run lint          # expo lint
npm test              # unit tests for streaks/dates
npm run test:db       # schema tests, needs a local Postgres (PGHOST/PGPORT/PGUSER)
```

## Expo

Expo ships breaking changes every SDK release; check the installed `expo` version in
`package.json` and read the matching docs at https://docs.expo.dev/versions/v<major>.0.0/
rather than relying on memory. Native folders (`ios/`, `android/`) are generated — configure
native behaviour in `app.json`.
