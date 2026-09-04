/* ═══════════════════════════════════════════════════════════
   The thing that actually sends.

   approve_officer() writes the message into email_outbox inside the
   same transaction as the role grant. Nothing in the database can send
   mail, so this function drains that queue and stamps each row.

   It is deliberately dumb: read what is unsent, send it, mark it. If it
   dies halfway, the unsent rows are still there and the next run picks
   them up. An email is never deleted from the queue, so there is always
   a record of what the club told somebody.

   ── Deploying ──────────────────────────────────────────────
     supabase functions deploy send-emails
     supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL=thesicaorg@gmail.com

   Then run it every few minutes from the dashboard:
     Database → Cron →  select cron.schedule(
       'drain-outbox', '*/5 * * * *',
       $$select net.http_post(
           url := 'https://<ref>.supabase.co/functions/v1/send-emails',
           headers := '{"Authorization":"Bearer <service_role key>"}'::jsonb
         )$$);

   Until that is done nothing here runs, and Officer Management's
   "Send the email" button hands the same message to Gmail instead.
   Both routes send the identical text, because both read this queue.
   ═══════════════════════════════════════════════════════════ */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND = 'https://api.resend.com/emails';

Deno.serve(async () => {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('FROM_EMAIL') ?? 'thesicaorg@gmail.com';

  if (!apiKey) {
    return json({ error: 'RESEND_API_KEY is not set, so nothing was sent.' }, 500);
  }

  /* The service role key, because the outbox is founder-only and this
     runs as nobody. It exists only in the function's environment. */
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: queue, error } = await db
    .from('email_outbox')
    .select('*')
    .is('sent_at', null)
    .order('created_at')
    .limit(50);

  if (error) return json({ error: error.message }, 500);
  if (!queue?.length) return json({ sent: 0, note: 'Nothing waiting.' });

  let sent = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const mail of queue) {
    try {
      const res = await fetch(RESEND, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `SICA <${from}>`,
          to: [mail.to_email],
          subject: mail.subject,
          text: mail.body
        })
      });

      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);

      /* Stamped only after the send actually succeeded. A row that is
         still unsent will simply be tried again next run, which is the
         right failure: a duplicate is recoverable, a silent drop is not. */
      await db.from('email_outbox')
        .update({ sent_at: new Date().toISOString(), error: null })
        .eq('id', mail.id);
      sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await db.from('email_outbox').update({ error: message }).eq('id', mail.id);
      failures.push({ id: mail.id, error: message });
    }
  }

  return json({ sent, failed: failures.length, failures });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
