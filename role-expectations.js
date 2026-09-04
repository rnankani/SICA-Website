/* ═══════════════════════════════════════════════════════════
   Officer role expectations — written once, shown twice.

   The application form expands the matching entry the moment someone
   picks a role, and the handbook renders the whole set as a chapter.
   Keeping the prose here rather than in either page means the two can
   never drift into saying different things about the same job, which
   is the specific failure that makes a handbook stop being trusted.

   `id` matches applications.role_applied in the database. Renaming one
   silently orphans every row already submitted under the old value, so
   add to LEGACY below instead of editing an id.
   ═══════════════════════════════════════════════════════════ */
window.SICA_ROLE_EXPECTATIONS = {
  /* Order is deliberate: it is the order of responsibility, and both
     the form and the handbook render it as given. */
  order: ['president', 'vp', 'treasurer_secretary', 'pr'],

  /* Every officer, regardless of role. Rendered under the set rather
     than repeated inside each one. */
  universal: 'Attend the weekly officer sync, show up to every club meeting on time, ' +
             'and communicate proactively if you cannot fulfil a task rather than letting it go silent.',

  roles: {
    president: {
      label: 'President',
      /* Not open on the application form — Reyansh holds it, and
         Chapter 8 elects it rather than recruiting for it. */
      applicable: false,
      owns: 'Overall direction of the club. You run meetings, represent SICA to the advisor ' +
            'and CHS administration, and make final calls when officers disagree.',
      /* `hours` is the same figure at chip length, for the homepage
         list where the full sentence would not fit. */
      hours: '2–3 hrs/week',
      commitment: '~2–3 hours weekly — meeting facilitation, weekly officer sync, planning.',
      success: 'Meetings run on time and on structure. The officer team stays aligned. ' +
               'SICA\u2019s application and probationary requirements stay on track with no missed deadlines.',
      reportsTo: 'The faculty advisor and, indirectly, ASB / Clubs Commission.',
      reality: 'This is the most exposed role — if something breaks, it is your name on it first. ' +
               'If you are not ready to be the default answer to \u201cwho is responsible for this,\u201d this is not your role yet.'
    },

    vp: {
      label: 'Vice President',
      applicable: true,
      owns: 'Backup to the President, plus a real domain of your own — typically curriculum ' +
            'oversight (making sure each week\u2019s lesson is actually ready) or officer coordination.',
      hours: '2 hrs/week',
      commitment: '~2 hours weekly.',
      success: 'If the President is unavailable, meetings still happen without a scramble. ' +
               'Your assigned domain never becomes the reason a meeting is not ready.',
      reportsTo: 'The President.',
      reality: 'This role requires being genuinely reliable, not just available. ' +
               '\u201cSecond in command\u201d only works if you can actually run things solo when needed.'
    },

    treasurer_secretary: {
      label: 'Treasurer / Secretary',
      applicable: true,
      /* One option, not two: the constitution allows one person to hold
         both, and splitting them on the form invited applications for
         half a job. */
      aside: 'One person may hold both halves, per the constitution.',
      owns: 'Treasurer half — any club funds and purchases once fundraising is permitted ' +
            'post-probation; before that this half is mostly dormant. Secretary half — meeting ' +
            'minutes for every single meeting, no exceptions, which is a hard CHS requirement, ' +
            'plus attendance tracking and club records.',
      hours: '1–2 hrs/week',
      commitment: '~1–2 hours weekly, growing once fundraising starts.',
      success: 'Minutes exist for every meeting, filed the same day. If a Clubs Commissioner ever ' +
               'asks where your records are, the answer is immediate, not \u201clet me find them.\u201d',
      reportsTo: 'The President.',
      reality: 'The least glamorous role, and the one CHS checks compliance against most directly. ' +
               'Detail-oriented people, not big-picture people, thrive here.'
    },

    pr: {
      label: 'PR / Media Director',
      applicable: true,
      owns: 'Recruitment materials, photography and video at meetings, and — once SICA passes ' +
            'the interview round — the official Instagram.',
      hours: '1–2 hrs/week',
      commitment: '~1–2 hours weekly, spikier around recruitment pushes such as Clubs Faire and signature drives.',
      success: 'SICA has a visual record of what actually happens at meetings. Recruitment materials ' +
               'look consistent with the brand. Social media, once live, posts real content rather than filler.',
      reportsTo: 'The President.',
      reality: 'Do not create any SICA social media account before the club passes the interview round. ' +
               'CHS policy explicitly bans this, and any account found early gets the application rejected.',
      /* The only expectation on this page that can lose the club its
         charter, so it is marked rather than left as prose. */
      warn: true
    }
  },

  /* Values submitted before Treasurer and Secretary were merged. The
     review tab still has to name them correctly. */
  legacy: { treasurer: 'Treasurer', secretary: 'Secretary' }
};
