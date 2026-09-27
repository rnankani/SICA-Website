/* ═══════════════════════════════════════════════════════════
   Authentication — email and password only.

   No OAuth provider, nothing to configure in Supabase beyond what is
   already on by default. An officer signs in with an email and a
   password; the access token is handed to db.js, which sends it as the
   Bearer on every request. Row Level Security then decides what that
   person may actually see.

   Without a token, db.js falls back to the anon key — which under
   schema.sql can do exactly one thing: insert an application. That is
   why the public form works signed-out and the portal does not.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.SICA_SUPABASE || {};
  var LIVE = !!(CFG.url && CFG.anonKey);
  var TOKEN = 'sica.token', REFRESH = 'sica.refresh', PROFILE = 'sica.profile';

  function store(k, v) {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {}
  }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function api(path, opts) {
    opts = opts || {};
    return fetch(CFG.url + '/auth/v1/' + path, {
      method: opts.method || 'POST',
      headers: {
        apikey: CFG.anonKey,
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (opts.token || CFG.anonKey)
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(async function (r) {
      var data = null;
      try { data = await r.json(); } catch (e) {}
      if (!r.ok) {
        var msg = (data && (data.msg || data.error_description || data.message)) || ('Error ' + r.status);
        throw new Error(msg);
      }
      return data;
    });
  }

  function keep(session) {
    if (!session || !session.access_token) return null;
    store(TOKEN, session.access_token);
    store(REFRESH, session.refresh_token || null);
    return session;
  }

  var AUTH = {
    live: LIVE,

    signedIn: function () { return !!read(TOKEN); },

    signUp: function (email, password) {
      if (CFG.emailDomain && email.slice(-CFG.emailDomain.length) !== CFG.emailDomain) {
        return Promise.reject(new Error('Use your ' + CFG.emailDomain + ' address.'));
      }
      return api('signup', { body: { email: email, password: password } })
        .then(function (d) {
          /* Supabase returns a session immediately when email confirmation
             is off, and only a user when it is on. */
          if (d && d.access_token) keep(d);
          return d;
        });
    },

    signIn: function (email, password) {
      return api('token?grant_type=password', { body: { email: email, password: password } })
        .then(keep);
    },

    signOut: function () {
      var t = read(TOKEN);
      store(TOKEN, null); store(REFRESH, null); store(PROFILE, null);
      if (!t) return Promise.resolve();
      return api('logout', { token: t }).catch(function () {});
    },

    /* Access tokens last an hour. Called on load so a returning officer
       is not bounced to the sign-in screen for no reason. */
    refresh: function () {
      var r = read(REFRESH);
      if (!r) return Promise.resolve(null);
      /* A valid access token needs no network refresh on every page.
         Supabase's expiry is embedded in the token; leave a two minute
         margin for clock drift and navigation in progress. */
      var current = read(TOKEN);
      if (current) {
        try {
          var encoded = current.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          var claims = JSON.parse(atob(encoded));
          if (typeof claims.exp === 'number' && claims.exp * 1000 > Date.now() + 120000)
            return Promise.resolve({ access_token: current });
        } catch (e) {}
      }
      return api('token?grant_type=refresh_token', { body: { refresh_token: r } })
        .then(keep)
        .catch(function () {
          store(TOKEN, null); store(REFRESH, null); store(PROFILE, null);
          return null;
        });
    },

    user: function () {
      var t = read(TOKEN);
      if (!t) return Promise.resolve(null);
      return api('user', { method: 'GET', token: t }).catch(function () { return null; });
    },

    /* The profiles row carries the role, which is what every sidebar and
       permission check reads. Cached so the rail does not wait on a
       round trip before it can draw. */
    profile: async function (force) {
      if (!LIVE || !read(TOKEN)) return null;
      if (!force) {
        try {
          var c = JSON.parse(read(PROFILE) || 'null');
          if (c) return c;
        } catch (e) {}
      }
      var u = await AUTH.user();
      if (!u || !u.id) return null;
      var rows = await fetch(CFG.url + '/rest/v1/profiles?id=eq.' + u.id + '&select=*', {
        headers: { apikey: CFG.anonKey, Authorization: 'Bearer ' + read(TOKEN) }
      }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
      var p = rows[0] || { id: u.id, email: u.email, role: 'member' };
      store(PROFILE, JSON.stringify(p));
      return p;
    },

    /* Health check used by the sign-in screen and Founder Tools. Do not
       probe an RLS-protected data table here: a signed-out visitor is
       supposed to be unable to SELECT applications, and treating that
       correct 401 as a bad key made a healthy login screen look broken. */
    ping: async function () {
      if (!LIVE) return { ok: false, reason: 'No url or key in supabase-config.js' };
      try {
        var r = await fetch(CFG.url + '/auth/v1/settings', {
          headers: { apikey: CFG.anonKey }
        });
        if (r.status === 401) return { ok: false, reason: 'Key rejected. Check the anon key.' };
        if (!r.ok) return { ok: false, reason: 'Supabase returned error ' + r.status + '.' };
        return { ok: true, reason: 'Connected' };
      } catch (e) {
        return { ok: false, reason: 'Cannot reach ' + CFG.url };
      }
    }
  };

  window.SICA_AUTH = AUTH;
})();
