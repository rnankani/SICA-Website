# SICA — Student Influence & Communication Association

Marketing site for SICA, a high-school program that teaches communication, influence, and presence — the skills schools don't teach.

> **Schools teach subjects. We teach people.**

## About

A single, self-contained `index.html` — vanilla HTML, CSS, and JavaScript. No build step, no dependencies, no framework. Editorial dark theme set in a fat Didone (Bodoni Moda) display face with a single brass accent.

### Highlights
- **Animated hero** — the SICA wordmark lifts in letter by letter, a white shine sweeps across it and the rule beneath, ending in a twinkle at the endpoint
- **Ink-bloom** headline reveals, **count-up** stats, and a **self-drawing** founder's signature
- **Scroll-pinned horizontal rail** for the curriculum
- Fully responsive, and respects `prefers-reduced-motion`

## Run locally

Any static file server works, for example:

```bash
python -m http.server 3000
```

Then open <http://localhost:3000>.

The shared officer workspace always uses Supabase and fails closed when
the database configuration is missing. Browser-local database mode is
available only for deliberate localhost prototyping by defining
`window.SICA_LOCAL_DEVELOPMENT = true` before `db.js` loads.

## Deploy

Deploys as-is to Vercel, Netlify, or GitHub Pages — it is just static files.

Frontend deployment does **not** apply database changes. Run pending files
in `supabase/migrations/` against the linked Supabase project before relying
on a feature that changes policies, grants, functions, or tables.

## Daily workspace rollout (October 11, 2026)

The Dashboard and Tasks pages share a persistent sidebar and right-side editor.
Tasks, dates, owners, and progress are read from Supabase; browser storage holds
only the sign-in session/preferences, never the production task list.

In **Supabase → SQL Editor**, run these files in order (against the existing
SICA database; do not reset it or delete records):

1. `supabase/migrations/202610110001_close_officer_applications.sql`
   closes new intake, including old browser tabs. Existing applications and
   review actions are preserved. The public website already shows “closed.”
2. `supabase/migrations/202610110002_task_workspace_access.sql`
   supplies explicit task grants and records task history atomically in the
   same transaction as each task change. Existing row-level policies remain.

These migrations are repeatable. The second expects the task v2 tables from
the existing `schema.sql`. Do not use a service key in frontend code.
Future reopening requires removing the `officer_intake_closed` database
trigger and restoring the application form/client method deliberately.

### Verification

Install `playwright` and `@electric-sql/pglite` in your local test environment,
then run:

```sh
node tests/workspace.test.cjs
node tests/database.test.cjs
node tests/site.test.cjs
```

The browser suite uses the actual frontend/auth/data adapter with a simulated
Supabase HTTP service. It covers task CRUD, timeline drag/resize, reloads and
an independent browser context, role views, mobile navigation, error recovery,
session refresh, and application closure. Set `CHROME_PATH` if Chrome is not
installed at the default Windows location. Screenshots go to an OS temp folder.

The database suite executes the full schema and migrations in isolated PGlite
PostgreSQL, with local substitutes for Supabase's `auth`/`storage` schemas. It
tests RLS roles, audit transactions, and intake closure without contacting
production. Neither suite proves that migrations have been run on Supabase.

After migration, verify with a real founder account: create a clearly labeled
test task, assign it to an officer, open it in a separate authenticated browser,
edit its dates, complete/reopen it, inspect Activity, and archive it. Confirm
the existing application inbox still loads. No live test accounts or tasks
were inserted by the automated suites.

### Interaction choices

The primary action sits beside the remaining-task count; owner and dates are
visible instead of hidden in menus; optional fields are secondary; failed
saves retain the draft. These follow the visibility, recognition-over-recall,
and error-recovery principles in [Nielsen Norman Group’s usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).
Motion is brief and respects reduced-motion preferences. Dashboard ↔ Tasks
uses in-place navigation; other officer modules remain ordinary page links.

---

© 2026 Student Influence & Communication Association · Cupertino High School
