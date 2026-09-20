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

---

© 2026 Student Influence & Communication Association · Cupertino High School
