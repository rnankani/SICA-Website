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

  /* Cosmetic only — it gives a clearer error on the form. The real
     rule is enforced by the handle_new_user() trigger in schema.sql,
     because anyone can call the auth API directly and never load this
     page. Change it in BOTH places or not at all. */
  emailDomain: '@student.fuhsd.org',

  /* Where a sign-in link returns to. Only used once email confirmation
     or OAuth is switched on; password sign-in does not need it. */
  redirectTo: 'https://www.joinsica.page/officers.html'
};
