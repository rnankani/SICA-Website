/* ═══════════════════════════════════════════════════════════
   Authentication — email and password only.

   No OAuth provider, nothing to configure in Supabase beyond what is
   already on by default. An officer signs in with an email and a
   password; the access token is handed to db.js, which sends it as the
   Bearer on every request. Row Level Security then decides what that
   person may actually see.

   Without a token, db.js falls back to the anon key. Private officer
   data is still protected by RLS; new officer intake is currently closed.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.SICA_SUPABASE || {};
  var LIVE = !!(CFG.url && CFG.anonKey);
  var TOKEN = 'sica.token', REFRESH = 'sica.refresh', PROFILE = 'sica.profile';
  var refreshFlight = null;

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
        var error = new Error(msg); error.status = r.status; error.code = data && data.code; throw error;
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
      email = String(email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Promise.reject(new Error('Enter a full email address, such as name@gmail.com.'));
      if (!password || password.length < 8) return Promise.reject(new Error('Choose a password of at least 8 characters.'));
      return api('signup?redirect_to=' + encodeURIComponent(CFG.redirectTo || location.origin + '/officers.html'), { body: { email: email, password: password } })
        .then(function (d) {
          /* Supabase returns a session immediately when email confirmation
             is off, and only a user when it is on. */
          if (d && d.access_token) { store(PROFILE, null); keep(d); }
          return d;
        });
    },

    signIn: function (email, password) {
      email = String(email || '').trim().toLowerCase();
      return api('token?grant_type=password', { body: { email: email, password: password } })
        .then(function(session){store(PROFILE,null);return keep(session);});
    },

    resendConfirmation: function (email) {
      email = String(email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Promise.reject(new Error('Enter your invited email address first.'));
      return api('resend?redirect_to=' + encodeURIComponent(CFG.redirectTo || location.origin + '/officers.html'), {body:{type:'signup',email:email}});
    },

    explainError: function (error) {
      var code=error.code||'', message=error.message||'The request failed. Please try again.';
      if (code==='invalid_credentials' || /invalid login credentials/i.test(message)) return 'Email or password was not accepted. Use the exact email you were invited with. If you have not registered yet, choose Create account first.';
      if (code==='email_not_confirmed' || /email not confirmed/i.test(message)) return 'Confirm your email before signing in. Check spam, or use Resend confirmation below.';
      if (code==='user_already_exists' || /already registered/i.test(message)) return 'An account already exists for this email. Sign in instead of creating it again.';
      if (code==='over_email_send_rate_limit' || error.status===429) return 'Supabase is temporarily limiting requests. Wait before trying again; repeated clicks will not help. If this continues, the founder needs to check Auth email delivery and rate limits.';
      if (code==='email_address_not_authorized') return 'The project email service cannot send to this address yet. Ask the founder to configure custom SMTP in Supabase Auth. Your email domain is allowed by SICA.';
      if (code==='unexpected_failure' || /database error saving new user/i.test(message)) return 'Account creation failed in the database. Ask the founder to verify that this exact email has an active invite, then check Supabase Auth logs. No officer access has been granted.';
      if (code==='signup_disabled') return 'Account creation is disabled in Supabase Auth. Ask the founder to enable new-user signups; the invite list still controls access.';
      return message;
    },

    consumeConfirmation: async function () {
      var hash=new URLSearchParams(location.hash.slice(1));
      if (!hash.has('access_token') && !hash.has('error')) return null;
      history.replaceState({},'',location.pathname+location.search);
      if (hash.has('error')) return 'That confirmation link is expired or invalid. Enter your email below and choose Resend confirmation.';
      var token=hash.get('access_token');
      try {
        var user=await api('user',{method:'GET',token:token});
        if (!user || !user.id) throw new Error('Invalid session');
        store(PROFILE,null);keep({access_token:token,refresh_token:hash.get('refresh_token')});
        return null;
      } catch (_) { return 'We could not verify that confirmation link. Sign in below, or request a new confirmation email.'; }
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
      if (refreshFlight) return refreshFlight;
      refreshFlight = api('token?grant_type=refresh_token', { body: { refresh_token: r } })
        .then(keep)
        .catch(function (error) {
          if (error.status === 400 || error.status === 401) {
            store(TOKEN, null); store(REFRESH, null); store(PROFILE, null);
            return null;
          }
          // A temporary outage is not a sign-out. Preserve the session.
          throw error;
        }).finally(function () { refreshFlight = null; });
      return refreshFlight;
    },

    user: function () {
      var t = read(TOKEN);
      if (!t) return Promise.resolve(null);
      return api('user', { method: 'GET', token: t });
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
      var response = await fetch(CFG.url + '/rest/v1/profiles?id=eq.' + u.id + '&select=*', {
        headers: { apikey: CFG.anonKey, Authorization: 'Bearer ' + read(TOKEN) }
      });
      if (!response.ok) throw new Error('Your account role could not be loaded. Refresh and try again; if it continues, ask the founder to check database access.');
      var rows=await response.json();
      if (!Array.isArray(rows) || !rows[0]) throw new Error('Your account profile is missing. Ask the founder to check your invitation and profile in Supabase.');
      var p = rows[0];
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
