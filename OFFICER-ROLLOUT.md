# Officer workspace rollout — October 25, 2026

## First: database update

Supabase project → SQL Editor → New query → paste and run the complete contents of `supabase/migrations/202610250001_shared_tasks_and_google_intake.sql`.

This adds shared role assignees, enforces their access, makes invite permissions explicit, prevents self-promotion through profile updates, and closes the retired interest RPC. It deletes no records. Existing single-owner task editing remains usable before the update; shared assignments require it. Refresh the portal afterward.

## Invite the confirmed officers

1. Sign in as the founder at https://www.joinsica.page/officers.html.
2. Open **Officer Management**. Enter the officer's name, exact email they will use, and role. Click **Add to invite list**. Invite VP, Treasurer and PR; leave Secretary vacant until selected.
3. Send that officer the portal URL yourself. Adding to the list does not send an invitation email.
4. They enter the same email and a password of at least 8 characters, then click **Create account**. They should not submit another application.
5. They open Supabase's confirmation email if confirmation is enabled, then sign in. Until you approve, they have no officer access.
6. Refresh Officer Management. Their row should now say **Registered**. Click **Approve**.
7. Ask them to sign out and back in so the newly granted role loads. They should see their Dashboard and assigned work. Test with one real task before onboarding the next officer.

If an account already exists, do not create a duplicate. Check its existing invite status first. Approved accounts can sign in directly. A Registered row is ready for approval. Do not use a shared founder login or hand out an API key.

Approval queues an email in the database. Delivery depends on the mail function configuration; the **Send the email** action opens a prewritten Gmail message for manual sending. Don't assume automatic delivery.

## Daily workflow

- Dashboard contains the timeline, searchable/filterable task list and right-hand editor. Old Tasks URLs redirect here.
- Owner = accountable person or role. Assignees = additional officer roles who can see and update the task. Only Founder/President can reassign.
- Right-click a sidebar tab → **Rearrange tabs…** → drag handles → **Save sidebar**. Pinning is in the same menu. Settings → **Arrange tabs** is the touch-friendly entry; keyboard users can use Shift+F10 and move focused handles with arrow keys.
- Sidebar preferences sync to the officer's account, not everyone else's layout.

## Interest intake

All public interest buttons and legacy form URLs now use the supplied Google Form. Google responses are not automatically synced to Supabase; view them in Google Forms / its linked response spreadsheet.

The prior custom form is saved in `templates/interest-2026/` as non-executable source, with restoration notes. Existing Supabase submissions remain in **Interest archive** for Founder, President and VP. No submissions or reference files were deleted.

## Verification scope

Local browser integration tests use an isolated HTTP substitute; SQL tests use an isolated PostgreSQL engine. They cover task saves/failures, shared assignments and permissions, invitation lifecycle, drag/resize, mobile layouts, sidebar sync/reordering, archive access, document upload/download and Google-link routing. No test accounts or submissions are written to production. Live database permissions still require the SQL step above and a real officer sign-in check.
