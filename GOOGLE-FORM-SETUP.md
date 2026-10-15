# SICA interest form — fastest school-ready setup

If Tino Clubs requires Google Forms and access to a response spreadsheet, use
Google Forms as the single official signup source. Keep SICA for officer tasks,
meetings, and references. Do not ask students to submit both forms.

## 1. Create the form

Open https://forms.google.com using the school-approved club account and create
a blank form. Title: **SICA — Interest Form**.

Description to paste:

> Interested in practicing everyday conversations, making connections, and
> feeling more confident with people? Join SICA's interest list for club updates.
> No experience needed. Your responses are for club leadership and authorized
> school club staff, not for public viewing.

Add these questions; turn on Required for every question except the last:

1. **Your name** — Short answer.
2. **Grade** — Dropdown: 9th, 10th, 11th, 12th.
3. **Student ID** — Short answer. Response validation → Regular expression →
   Matches: `^[0-9]{7}$`. Error: “Enter exactly 7 digits. No letters or symbols.”
   Keep this as text, not a numeric spreadsheet calculation, to retain zeros.
4. **Student email** — Short answer. Ask for the full address. Regular expression
   → Matches: `^[A-Za-z0-9._%+-]+@fuhsd[.]org$`.
   Error: “Enter your full @fuhsd.org school email address.”
5. **What interests you about SICA, and what would you like to practice?** —
   Paragraph. Description: “Write 2–3 detailed sentences with at least 15 words
   total.” For the minimum, use Regular expression → Matches:
   `^\s*\S+(\s+\S+){14,}\s*$`. Error: “Please write at least 15 words.”
   This word rule does not enforce sentence count; the description sets that
   expectation without brittle punctuation restrictions.
6. **Any question for us?** — Paragraph, optional.

Confirmation: “You're on the SICA interest list. Watch your school email for
club updates. Thanks for being interested!”

## 2. Link the spreadsheet — no code

In the form, open **Responses → More → Select destination for responses →
Create a new spreadsheet → Create**. Name it **SICA Interest Responses**.
Google Forms handles the response-to-sheet connection; no Supabase integration
is needed. If your UI shows **Link to Sheets**, that opens the same setup.

## 3. Share privately

- Obtain the commissioner/Tino Clubs account's exact school email address.
- Share the spreadsheet with that specific account. Viewer is enough for
  reading responses; use Editor only if the school actually requires editing.
- If the school also requires access to the form itself, add that account as
  an Editor through the form's Share controls. Editors can change the form.
- Check the form and spreadsheet access lists separately. Later permission
  changes on one do not automatically update the other.
- Do not enable **View results summary** for respondents. It can expose full
  answers to anyone who can respond. Keep student IDs and emails private.
- Use the responder access settings required by your school. Test with a real
  student account before advertising the link.

## 4. Publish, test, then connect SICA

Publish the form and copy the **responder link**, not the editor/share link.
Submit one clearly labeled test response; check it in both Forms and Sheets,
including a student ID with a leading zero. Confirm the commissioner can open
the files with their own account.

Send the responder link here. All SICA Interest Form buttons can point directly
to it. A direct link is the simplest first release; an embedded form can come
later. Existing Supabase signups remain available and should not be deleted.

## Official Google instructions

- [Choose where to save responses](https://support.google.com/docs/answer/2917686?hl=en)
- [Share with form collaborators](https://support.google.com/docs/answer/2917111?hl=en)
- [Publish and share with responders](https://support.google.com/docs/answer/2839588?hl=en)
- [Set response-validation rules](https://support.google.com/docs/answer/3378864?hl=en)
