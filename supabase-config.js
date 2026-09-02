/* ═══════════════════════════════════════════════════════════
   THE ONLY FILE YOU EDIT TO GO LIVE.

   Paste the two values from Supabase → Project Settings → API.
   Nothing else in the codebase needs to change: every page already
   calls through db.js, which switches from the local adapter to the
   Supabase adapter the moment `url` is filled in.

   Both of these are safe in front-end code — that is what the anon key
   is designed for, and Row Level Security in schema.sql is what
   actually protects the data.

   NEVER put the service_role key here. It bypasses every policy.
   ═══════════════════════════════════════════════════════════ */
window.SICA_SUPABASE = {
  url: '',      // e.g. 'https://abcdefgh.supabase.co'
  anonKey: '',  // the long "anon public" key

  /* Only addresses ending in this may create an account. Set to '' to
     allow any email. */
  emailDomain: '@student.fuhsd.org',

  /* Where Supabase sends people back to after Google sign-in. */
  redirectTo: 'https://rnankani.github.io/SICA-Website/officers.html'
};
