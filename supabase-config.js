/* ═══════════════════════════════════════════════════════════
   Supabase connection.

   These two values are public by design — they ship in the browser and
   anyone can read them. Row Level Security in schema.sql is what
   actually protects the data, not secrecy of this key.

   The service_role key must NEVER appear here. It bypasses every
   policy. It lives in .env (untracked) and nowhere else.
   ═══════════════════════════════════════════════════════════ */
window.SICA_SUPABASE = {
  /* derived from the project ref inside the anon JWT */
  url: 'https://hmcbewvamelslwxpdzqb.supabase.co',

  /* the newer publishable key — same permissions as the legacy anon JWT */
  anonKey: 'sb_publishable_bGd6xb2b0dADbwqLY5JNdw_a9-yyoK-',

  /* Any valid email may be invited. Access is enforced by the invite
     record and founder approval, never by a school-email suffix. */

  /* Where a sign-in link returns to. Only used once email confirmation
     or OAuth is switched on; password sign-in does not need it. */
  redirectTo: 'https://www.joinsica.page/officers.html'
};
