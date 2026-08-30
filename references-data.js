/* ═══════════════════════════════════════════════════════════
   References — the one place a link to a standalone doc lives.

   Deliberately flat and static: every other tab holds live, structured
   data, this one just answers "where's the doc for X".

   To wire a row up, paste the Google Doc URL into `url`. Rows with an
   empty url render as "Link not added" rather than a dead link, so a
   missing doc is visible instead of silently broken.
   ═══════════════════════════════════════════════════════════ */
window.SICA_REFERENCES = [
  {
    group: 'Curriculum',
    items: [
      {title: "This Year's Curriculum (12-Week)", url: ''},
      {title: 'Full Program Curriculum (30-Week)', url: ''}
    ]
  },
  {
    group: 'About SICA',
    items: [
      {title: 'Mission &amp; Vision', url: ''},
      {title: 'Ethics: Influence vs. Manipulation', url: ''},
      {title: 'Officer Roles &amp; Structure', url: ''},
      {title: 'How We Measure Growth', url: ''},
      /* already lives in the workspace — link inward rather than duplicate it */
      {title: 'Branding Reference', url: 'branding.html', internal: true}
    ]
  },
  {
    group: 'Recruiting &amp; Outreach',
    items: [
      {title: 'One-Page Flyer', url: ''},
      {title: 'Advisor FAQ', url: ''},
      {title: "What We're Asking For (advisor pitch)", url: ''},
      {title: 'Pilot Session Recap Template', url: ''}
    ]
  },
  {
    group: 'Governance',
    items: [
      {title: 'Club Constitution', url: ''},
      {title: 'Officer Handbook', url: 'handbook.html', internal: true}
    ]
  }
];
