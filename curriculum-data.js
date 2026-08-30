/* ═══════════════════════════════════════════════════════════
   SICA curriculum — two tracks, one shape.

   Every meeting is 40 minutes and follows the same five blocks, so a
   meeting plan is only ever three things: the Concept, the Practice and
   the Challenge. Anything a meeting needs beyond that goes in `note`.

   Track A is the real Year 1 (second semester only). Track B is the
   standard year every future officer team inherits.
   ═══════════════════════════════════════════════════════════ */
window.SICA_CURRICULUM = {

  /* The block structure every meeting inherits. Practice is 20 of the 40
     minutes on purpose — it is the only block that must never be cut. */
  template: [
    ['0:00', '0:05', 'Arrival',  'Prompt on screen. No formal content.'],
    ['0:05', '0:10', 'Concept',  'One idea, one example.'],
    ['0:10', '0:30', 'Practice', 'The activity. Never cut this short.'],
    ['0:30', '0:36', 'Debrief',  'Two or three shares, then one closing insight.'],
    ['0:36', '0:40', 'Close',    'State the weekly challenge in one sentence.']
  ],

  growth: {
    trigger: '25+ consistent attendees across 3 straight meetings',
    then: 'Keep the format exactly as-is and open a general-interest signup for anyone else who has heard about it.',
    validated: 'If total interest crosses 30+, treat that as validated demand and greenlight the afterschool deep-dive track.',
    warning: 'Do not announce the second program before this threshold is actually hit. Let the numbers decide, not hope.'
  },

  amphitheater: {
    use: 'Worth using for Public Speaking and the Capstone — a real stage changes the stakes of a speaking exercise in a way a classroom cannot fake.',
    catch: 'Book through Facilities/ASB in advance; it is not guaranteed to be free. Never build a meeting plan that depends on it until it is actually reserved — keep the classroom version ready as the default.'
  },

  tracks: {

    /* ══════════ TRACK A — this year, second semester ══════════ */
    a: {
      id: 'a',
      label: 'This year',
      sub: 'Second semester &middot; 12 meetings + 2 optional',
      blurb: 'The real Year 1. Two meetings per phase, all six phases represented, nothing rushed into the time you actually have.',
      phases: [
        {n: 'P1', name: 'Self', meetings: [
          {no: 1, title: 'Welcome + Emotional Intelligence', ready: true,
           concept: 'EQ is self-awareness plus self-regulation &mdash; not "being nice".',
           practice: 'Partner interviews. Describe a moment you reacted emotionally; your partner identifies the trigger.',
           challenge: 'Notice one emotional trigger this week and do not act on it immediately.',
           note: 'Run the 3-minute baseline self-assessment during the arrival block &mdash; 8 skills, 1&ndash;5 scale. This is your proof-of-growth data point; without it M12 has nothing to compare against.'},
          {no: 2, title: 'Active Listening', ready: true,
           concept: 'The three levels of listening. Most people operate at level one, waiting to talk.',
           practice: '3-minute partner talk. The listener cannot speak, then repeats back what was said &mdash; including what was not said.',
           challenge: 'One full conversation: zero statements about yourself, five questions.'}
        ]},
        {n: 'P2', name: 'Others', meetings: [
          {no: 3, title: 'Reading People', ready: true,
           concept: 'Three signals that matter most: openness, mirroring, micro-hesitation.',
           practice: 'Silent charades. One partner acts a mood, the other guesses and explains which cue gave it away.',
           challenge: 'Guess one person&rsquo;s mood today before they say it.'},
          {no: 4, title: 'Empathy in Practice', ready: false,
           concept: 'Empathy is a skill &mdash; perspective-taking on command, not a feeling.',
           practice: 'Partner describes a frustration; the listener restates the feeling underneath, not just the facts.',
           challenge: 'Validate someone&rsquo;s feeling this week without trying to fix it.'}
        ]},
        {n: 'P3', name: 'Communication', meetings: [
          {no: 5, title: 'Storytelling', ready: false,
           concept: 'The three-part structure: setup, tension, payoff.',
           practice: '90-second story on the spot. Partner gives one specific improvement.',
           challenge: 'Tell one story this week using the structure.'},
          {no: 6, title: 'Spontaneous Thinking', ready: false,
           concept: 'Why we freeze, and the "pause, structure, answer" technique.',
           practice: 'Rapid-fire random questions. 30-second answers, no prep.',
           challenge: 'Answer one unexpected question without saying "um" first.'},
          {no: 0, title: 'First Impressions', ready: false, bonus: true,
           concept: 'The 7-second rule and what people actually judge in that window.',
           practice: 'Practice a 10-second self-introduction, rotating partners.',
           challenge: 'Give one deliberately strong first impression this week.',
           note: 'Run only if the semester stretches to 13&ndash;14 meetings.'}
        ]},
        {n: 'P4', name: 'Influence', meetings: [
          {no: 7, title: 'The Science of Persuasion', ready: false, ethics: true,
           concept: 'Reciprocity and social proof &mdash; plus the ethics line between influence and manipulation.',
           practice: 'Pitch a small idea to a partner two ways: with and without a principle.',
           challenge: 'Notice one time someone uses reciprocity or social proof on you.'},
          {no: 8, title: 'Negotiation Basics', ready: false,
           concept: 'Positions versus interests &mdash; the core reframe.',
           practice: 'Two-item trade scenario in pairs. Find the interest behind the ask.',
           challenge: 'Ask "why do you want that" once before agreeing or disagreeing.'}
        ]},
        {n: 'P5', name: 'Leadership', meetings: [
          {no: 9, title: 'Interview Skills', ready: false,
           concept: 'The STAR method for behavioural questions.',
           practice: 'Partner mock-interview. One real question, STAR structure required.',
           challenge: 'Write one STAR story before the next meeting.'},
          {no: 10, title: 'Networking Without the Cringe', ready: false,
           concept: 'One good opener and one good follow-up question.',
           practice: 'Speed-networking rotation. Three minutes per person, three rotations.',
           challenge: 'Introduce yourself to one person you do not know.'},
          {no: 0, title: 'Executive Presence', ready: false, bonus: true,
           concept: 'Posture, pacing, pausing.',
           practice: 'A 60-second impromptu announcement, with feedback.',
           challenge: 'Pause before answering one question this week instead of rushing.',
           note: 'Run only if the semester stretches to 13&ndash;14 meetings.'}
        ]},
        {n: 'P6', name: 'Integration', meetings: [
          {no: 11, title: 'Difficult Conversations', ready: false,
           concept: '"Name it, don&rsquo;t blame it" framing.',
           practice: 'Role-play a mild real conflict scenario using the framing.',
           challenge: 'Have one avoided conversation before the year ends.'},
          {no: 12, title: 'Capstone', ready: false, stage: true,
           concept: 'Recap the year in one slide.',
           practice: 'Mini-gauntlet &mdash; three rotating challenges pulled from earlier meetings: a listening round, a spontaneous-question round, a mini-pitch round.',
           challenge: 'None. Preview next fall&rsquo;s full 30-week year.',
           note: 'Final self-assessment on the same 8 skills as M1, compared live against the baseline. Use the amphitheater here if it is booked.'}
        ]}
      ]
    },

    /* ══════════ TRACK B — the standard 30-week year ══════════ */
    b: {
      id: 'b',
      label: 'Full year',
      sub: '30 meetings &middot; standard for future years',
      blurb: 'Every topic gets its own 40-minute meeting. M27 replaces the original Personal Branding, which duplicated M16 &mdash; facilitation was the real gap.',
      phases: [
        {n: 'P1', name: 'Self', meetings: [
          {no: 1, title: 'Orientation + Baseline Assessment', ready: false,
           concept: 'What SICA is, how the year works, and what "measured growth" means.',
           practice: 'Full 8-skill baseline self-assessment (1&ndash;5), then pair up and share the one skill you most want to improve.',
           challenge: 'Write down why you joined. You will reread it at M30.'},
          {no: 2, title: 'Emotional Intelligence', ready: false,
           concept: 'Self-awareness and self-regulation &mdash; the two EQ components that matter for this room.',
           practice: 'Partner interviews on a moment of strong emotional reaction. Identify the trigger.',
           challenge: 'Notice one trigger this week without acting on it.'},
          {no: 3, title: 'Self-Awareness: Triggers and Defaults', ready: false,
           concept: 'Everyone has a default communication mode under stress. Name yours.',
           practice: 'Quick self-inventory, then partner discussion comparing defaults.',
           challenge: 'Catch yourself in your default mode once this week.'},
          {no: 4, title: 'First Impressions', ready: false,
           concept: 'The 7-second rule and what people actually judge in that window.',
           practice: '10-second self-introductions, rotating partners, quick feedback each time.',
           challenge: 'Give one deliberately strong first impression this week.'},
          {no: 5, title: 'Active Listening', ready: false,
           concept: 'The three levels of listening.',
           practice: '3-minute partner talk, no interrupting, full playback after.',
           challenge: 'One conversation: five questions, zero statements about yourself.'}
        ]},
        {n: 'P2', name: 'Others', meetings: [
          {no: 6, title: 'Social Intelligence', ready: false,
           concept: 'Reading a room &mdash; status, comfort, group energy.',
           practice: 'Observe a short clip or live role-play and identify the social dynamics happening beneath the words.',
           challenge: 'Notice one room&rsquo;s energy today and name it.'},
          {no: 7, title: 'Body Language: What Research Shows', ready: false,
           concept: 'Three signals that matter most: openness, mirroring, micro-hesitation.',
           practice: 'Silent charades &mdash; act a mood, partner guesses and explains the cue.',
           challenge: 'Consciously mirror one person&rsquo;s posture in conversation this week.'},
          {no: 8, title: 'Nonverbal Communication: Sending Signals', ready: false,
           concept: 'How to project confidence nonverbally &mdash; posture, eye contact, pacing.',
           practice: '30-second confident-stance drills with partner feedback.',
           challenge: 'Hold eye contact one full second longer than usual today.'},
          {no: 9, title: 'Empathy as a Skill', ready: false,
           concept: 'Perspective-taking on command.',
           practice: 'Partner shares a frustration; the listener restates the feeling underneath.',
           challenge: 'Validate one feeling this week without trying to fix it.'},
          {no: 10, title: 'Social Dynamics: Power, Status, Ethics', ready: false, ethics: true,
           concept: 'How status forms in groups, and where the ethical line sits.',
           practice: 'Small-group scenario &mdash; identify who holds informal status and why.',
           challenge: 'Notice one status dynamic in a group you are part of this week.'}
        ]},
        {n: 'P3', name: 'Communication', meetings: [
          {no: 11, title: 'Verbal Communication: Precision and Framing', ready: false,
           concept: 'How framing changes meaning without changing the facts.',
           practice: 'Reframe the same statement three different ways with a partner.',
           challenge: 'Catch yourself using a weak frame and rephrase it.'},
          {no: 12, title: 'Spontaneous Thinking', ready: false,
           concept: 'The "pause, structure, answer" technique.',
           practice: 'Rapid-fire questions, 30-second answers, no prep.',
           challenge: 'Answer one unexpected question without "um".'},
          {no: 13, title: 'Storytelling', ready: false,
           concept: 'Three-part structure: setup, tension, payoff.',
           practice: '90-second story on the spot, partner feedback.',
           challenge: 'Tell one story using the structure this week.'},
          {no: 14, title: 'Public Speaking', ready: false, stage: true,
           concept: 'The difference between reading and speaking &mdash; eye contact, pacing, pauses.',
           practice: '60-second impromptu talk to the full group, one piece of feedback each.',
           challenge: 'Speak up once in a class or setting where you would normally stay quiet.',
           note: 'Amphitheater meeting if booked. Keep the classroom version ready as the default.'},
          {no: 15, title: 'Written Communication', ready: false,
           concept: 'Clarity over cleverness &mdash; the one-sentence-per-idea rule.',
           practice: 'Rewrite a cluttered paragraph into three clear sentences.',
           challenge: 'Rewrite one real email or message before you send it this week.'},
          {no: 16, title: 'Digital Presence and Personal Brand', ready: false,
           concept: 'What your online presence says before you say anything.',
           practice: 'Partner review of each other&rsquo;s public profile &mdash; one honest note each.',
           challenge: 'Fix one thing about your online presence this week.'}
        ]},
        {n: 'P4', name: 'Influence', meetings: [
          {no: 17, title: 'The Science of Influence', ready: false, ethics: true,
           concept: 'Two Cialdini principles &mdash; reciprocity and social proof &mdash; and where influence becomes manipulation.',
           practice: 'Pitch an idea two ways, with and without a principle.',
           challenge: 'Spot one principle being used on you this week.'},
          {no: 18, title: 'Persuasion in Practice', ready: false, ethics: true,
           concept: 'Evidence versus emotion in persuasive framing.',
           practice: 'Argue the same position two ways &mdash; pure logic, then pure emotion. Partner rates which landed.',
           challenge: 'Notice which style persuades you more this week.'},
          {no: 19, title: 'Negotiation: Principles', ready: false,
           concept: 'Positions versus interests.',
           practice: 'Two-item trade scenario. Find the interest behind the ask.',
           challenge: 'Ask "why do you want that" once before responding.'},
          {no: 20, title: 'Negotiation: Advanced Tactics', ready: false,
           concept: 'Anchoring, and the power of silence.',
           practice: 'Mock negotiation with a starting anchor; the partner practises holding silence after an offer.',
           challenge: 'Try anchoring once in a low-stakes real negotiation.'},
          {no: 21, title: 'Conflict Resolution', ready: false,
           concept: 'The five conflict modes &mdash; compete, collaborate, avoid, accommodate, compromise &mdash; and picking the right one.',
           practice: 'Role-play a disagreement twice using two different modes, then compare outcomes.',
           challenge: 'Name the mode you default to, and try a different one this week.'},
          {no: 22, title: 'Difficult Conversations', ready: false,
           concept: '"Name it, don&rsquo;t blame it."',
           practice: 'Role-play a mild real conflict using the framing.',
           challenge: 'Have one avoided conversation this month.'}
        ]},
        {n: 'P5', name: 'Leadership', meetings: [
          {no: 23, title: 'Leadership Psychology', ready: false,
           concept: 'What actually predicts leadership effectiveness &mdash; trained behaviours, not charisma alone.',
           practice: 'Identify one leadership behaviour you already do well and one you do not.',
           challenge: 'Practise the weaker behaviour once this week.'},
          {no: 24, title: 'Executive Presence', ready: false,
           concept: 'Posture, pacing, pausing &mdash; the physical components of being taken seriously.',
           practice: '60-second impromptu announcement with feedback.',
           challenge: 'Pause before answering one question this week instead of rushing.'},
          {no: 25, title: 'Networking', ready: false,
           concept: 'One good opener, one good follow-up question.',
           practice: 'Speed-networking rotation, three rounds.',
           challenge: 'Introduce yourself to one new person.'},
          {no: 26, title: 'Interview Skills', ready: false,
           concept: 'The STAR method.',
           practice: 'Partner mock-interview, real question, STAR required.',
           challenge: 'Write one STAR story.'},
          {no: 27, title: 'Facilitation &amp; Leading Discussions', ready: false,
           concept: 'How to run a group conversation so that everyone actually participates.',
           practice: 'Each member facilitates a 5-minute mini-discussion for a small group, rotating roles.',
           challenge: 'Facilitate one real group conversation this week &mdash; a project meeting, a group assignment, anything.',
           note: 'Replaces the original Personal Branding, which duplicated M16. Facilitation was missing from the whole curriculum.'}
        ]},
        {n: 'P6', name: 'Integration', meetings: [
          {no: 28, title: 'Decision Making Under Uncertainty', ready: false,
           concept: 'Fast decisions with incomplete information &mdash; the "good enough" threshold.',
           practice: 'Timed decision scenarios; the partner explains their reasoning afterwards.',
           challenge: 'Make one decision faster than you normally would, without agonising.'},
          {no: 29, title: 'The Integration Challenge (Gauntlet)', ready: false, stage: true,
           concept: 'No new concept. This meeting is 100% practice.',
           practice: 'Five rotating rounds pulling from the entire year: listening, spontaneous speaking, persuasion, negotiation, conflict framing.',
           challenge: 'None &mdash; this is the challenge.',
           note: 'Amphitheater meeting if booked.'},
          {no: 30, title: 'Capstone and Annual Reflection', ready: false,
           concept: 'What changed, and what to work on next year.',
           practice: 'Final 8-skill self-assessment, compared live against the M1 baseline. Reread the "why you joined" note from Meeting 1.',
           challenge: 'None. Close the year.'}
        ]}
      ]
    }
  }
};
