/* Evidence behind the plan. Every source was looked up and checked 2026-10-01 — keep claims to what the source says. */
const SCIENCE = [
  {
    title: "Train every muscle at least twice a week",
    finding: "The 2026 ACSM position stand (137 systematic reviews, 30,000+ participants) recommends training all major muscle groups on at least 2 days per week, with at least 2 sets per exercise. Its main message: going from no training to any training is the biggest win.",
    app: "Three full-body sessions a week hit every muscle 3×, with 3 sets per move. Your weekly goal defaults to 3.",
    src: "ACSM Position Stand on Resistance Training, 2026",
    url: "https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/",
  },
  {
    title: "Bodyweight progressions build real strength",
    finding: "Men doing progressively harder push-up variations, 3×/week for 4 weeks, gained bench-press strength comparable to a group that bench-pressed. It's a small, short study, but it is the direct test of the ladder method.",
    app: "Instead of adding weight, you climb a ladder of harder variations of each move.",
    src: "Kotarsky et al., J Strength Cond Res, 2018",
    url: "https://pubmed.ncbi.nlm.nih.gov/29466268/",
  },
  {
    title: "Go close to failure, not to failure",
    finding: "ACSM 2026: training to absolute failure isn't necessary; sets ending around 2–3 reps in reserve are enough. A 2024 meta-regression found muscle growth improves modestly as sets end closer to failure, while strength gains depend little on it.",
    app: "Each set: stop when you have about 1–3 clean reps left. Full range of motion on every rep.",
    src: "Robinson et al., Sports Medicine, 2024 · ACSM 2026",
    url: "https://rke.abertay.ac.uk/en/publications/exploring-the-dose-response-relationship-between-estimated-resist/",
  },
  {
    title: "Progress when you beat the target",
    finding: "The ACSM progression model: once you can do 1–2 reps more than the target, make it harder.",
    app: "Hit the top of the rep range on every set and the exercise is ready to level up to the next rung.",
    src: "ACSM Position Stand, Med Sci Sports Exerc, 2009",
    url: "https://sfu.ca/~ryand/kin343/ACSMresistance.pdf",
  },
  {
    title: "Volume adds up: aim for ~10 sets per muscle per week",
    finding: "A meta-analysis found a dose-response relationship between weekly sets and muscle growth, with 10+ sets per muscle per week trending best in the available data.",
    app: "Over a week your pulling and pushing muscles each get about 12–15 hard sets; quads about 9.",
    src: "Schoenfeld, Ogborn & Krieger, J Sports Sci, 2017",
    url: "https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324_Dose-response_relationship_between_weekly_resistance_training_volume_and_increases_in_muscle_mass_A_systematic_review_and_meta-analysis/links/59dc0269458515e9ab4527d6/Dose-response-relationship-between-weekly-resistance-training-volume-and-increases-in-muscle-mass-A-systematic-review-and-meta-analysis.pdf",
  },
  {
    title: "Rest long enough to repeat the effort",
    finding: "Resting more than 60 seconds between sets gave a small hypertrophy benefit; past about 90 seconds no further difference was detected.",
    app: "The rest timer gives 90–120s on the big moves and 60–75s on core holds.",
    src: "Singer et al., Front Sports Act Living, 2024",
    url: "https://pubmed.ncbi.nlm.nih.gov/39205815/",
  },
  {
    title: "Cover every movement pattern",
    finding: "Both ACSM position stands call for training all major muscle groups with multi-joint exercises, using both two-sided and single-side moves.",
    app: "Your plan is built from 12 movement-pattern slots (vertical and horizontal pull and push, knee- and hip-dominant legs, three kinds of core). Each slot gets the best ladder your equipment allows.",
    src: "ACSM 2009 & 2026",
    url: "https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/",
  },
  {
    title: "Big moves first",
    finding: "Both ACSM position stands advise doing multi-joint and higher-intensity exercises earlier in the session.",
    app: "Every session opens with pulls and pushes, then legs, and ends with core.",
    src: "ACSM 2009 & 2026",
    url: "https://sfu.ca/~ryand/kin343/ACSMresistance.pdf",
  },
  {
    title: "Nordic curls protect your hamstrings",
    finding: "Across 15 studies and 8,459 athletes, programmes that included the Nordic hamstring exercise roughly halved hamstring injuries (risk ratio 0.49).",
    app: "Workout B's posterior ladder climbs from glute bridges to full Nordic curls.",
    src: "van Dyk, Behan & Whiteley, Br J Sports Med, 2019",
    url: "https://bjsm.bmj.com/content/53/21/1362",
  },
  {
    title: "Plan lighter weeks — don't stop",
    finding: "Coaches typically schedule a 5–7 day lighter week every 4–6 weeks, cutting sets and reps while keeping their usual training days (expert consensus). The only randomized trial found a full week off didn't boost muscle growth and slightly reduced leg strength. The evidence here is mostly expert practice — treat it as a guide.",
    app: "After 6 weeks of training the app suggests a deload: same sessions, about a third fewer sets, sets stopped 3–4 reps short of failure, no level-up pressure. You can also start one any time from Settings.",
    src: "Bell et al., Sports Med Open 2023 · Coleman et al., PeerJ 2024",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10809978/",
  },
  {
    title: "Eat enough protein to grow",
    finding: "A meta-analysis of 49 trials found protein boosted gains from resistance training, with no further muscle gain above about 1.6 g per kg of body weight per day.",
    app: "Not tracked here. A practical target is about 1.6 g/kg/day, e.g. ~110 g for a 70 kg person.",
    src: "Morton et al., Br J Sports Med, 2018",
    url: "https://bjsm.bmj.com/content/52/6/376",
  },
];

/* Known limit of this plan — shown so it isn't oversold. */
const SCIENCE_CAVEAT = "Honest limit: hamstrings get the least direct work (one move, Workout B only). Squats, lunges and bridges help, but it's below the ~10 sets/week mark.";
