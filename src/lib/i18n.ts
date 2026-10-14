/* ─── UI language: French for FR locales, English otherwise ─── */

export type Lang = 'en' | 'fr';

export const detectLang = (locale: string): Lang =>
  locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';

const LANG_STORAGE_KEY = 'lang';

/** Language picked with the navbar switch, if any (storage may be missing or blocked) */
function storedLang(): Lang | null {
  try {
    const value = localStorage.getItem(LANG_STORAGE_KEY);
    return value === 'en' || value === 'fr' ? value : null;
  } catch {
    return null;
  }
}

/** Current UI language; a live binding, so readers always see the latest switch */
export let LANG: Lang =
  storedLang() ?? detectLang(typeof navigator !== 'undefined' ? navigator.language : 'en');

const listeners = new Set<() => void>();

/** Notifies on every language switch (see useLang) */
export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyLang(lang: Lang) {
  if (lang === LANG) return;
  LANG = lang;
  t = messagesFor(lang);
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((listener) => listener());
}

/** Switches the UI language in place and remembers it for next visits */
export function switchLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* Storage blocked: the switch still applies until the page is reloaded */
  }
  applyLang(lang);
}

// Other windows of the app (the presenter screen) follow the switch
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LANG_STORAGE_KEY) applyLang(storedLang() ?? LANG);
  });
}

/** What a fun stat's text is built from (see lib/funStats) */
interface FunStatValues {
  name?: string;
  category?: string;
  value?: string;
  color?: string;
  score?: string;
}
const stat = (title: string, text: (v: FunStatValues) => string) => ({ title, text });

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;
/** French keeps 0 and 1 singular */
const pluralFr = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

const en = {
  mandatory: ' - mandatory',
  save: 'Save',
  cancel: 'Cancel',
  /** Before the session code, followed by a space */
  codeLabel: 'Code:',
  votes: (n: number) => plural(n, 'vote'),
  votesReceived: (n: number, total: number) => `${n} / ${total} votes received`,
  categoryOf: (i: number, n: number) => `Category ${i} of ${n}`,
  categoryPosition: (i: number, n: number) => `category ${i} of ${n}`,
  loadingResults: 'Loading results…',
  backToHome: 'Back to home',
  sessionNotFound: 'Session not found',
  connecting: 'Connecting to session…',
  reconnecting: 'Reconnecting…',
  switchLang: 'Passer en français',
  skipToContent: 'Skip to main content',
  pageTitle: (page?: string) => (page ? `${page} – Squad Health Check` : 'Squad Health Check'),
  sessionTitle: (code: string) => `Session ${code}`,

  colors: { green: 'Green', orange: 'Orange', red: 'Red' },
  colorFallbacks: {
    green: "Not perfect, but we're happy with how things are and see no need to improve right now.",
    orange: "Significant problems we need to address, but it's not a disaster.",
    red: "This really isn't working and needs to improve quickly.",
  },
  trends: { up: 'Improving', stable: 'Stable', down: 'Getting worse' },

  home: {
    welcome: 'Squad Health Check',
    intro:
      "Do your team health check.",
    createTitle: 'Create a New Session',
    createText: 'Set up categories and invite your team',
    createButton: 'Create Session',
    joinTitle: 'Join a Session',
    sessionCode: 'Session code',
    codePlaceholder: 'Session code',
    codeHelper: 'e.g. CLEVER',
    codeMissing: 'Enter the session code shared by your facilitator.',
    joinButton: 'Join Session',
    howItWorks: 'How it works',
    steps: [
      {
        title: 'Prepare and invite',
        text: 'The facilitator sets up the session, picks the categories, then shares the code, link or QR code.',
      },
      {
        title: 'Vote',
        text: 'For each category, everyone picks a health colour and a trend. Votes stay hidden until the round is revealed.',
      },
      {
        title: 'Discuss',
        text: 'The results, median and comparison with last time show on the shared screen. Talk it through, especially where votes differ.',
      },
      {
        title: 'Keep a record',
        text: 'Download the recap as Markdown, PDF or JSON. Next time, the JSON lets you compare with this session.',
      },
    ],
  },

  create: {
    title: 'Create New Session',
    intro: 'Customise the categories for your health check, then start the session.',
    noCategories: 'Add at least one category before starting the session.',
    start: 'Start Session',
  },

  settings: {
    title: 'Session settings',
    facilitatorVotes: 'I take part in the vote',
    anonymity: 'Vote anonymization',
    levels: { off: 'Off (recommended)', facilitator: 'Facilitator only', full: 'Full' },
    levelHints: {
      off: 'Everyone sees who voted what once a round is revealed.',
      facilitator: 'Only you see who voted what once a round is revealed; the team sees totals.',
      full: 'Nobody sees who voted what, only totals.',
    },
    voteMode: 'Vote mode',
    voteModes: { colors: 'Colors', range: 'Range (1 to 9)' },
    voteModeHints: {
      colors: 'Everyone picks a health colour (green, orange or red) and a trend.',
      range: 'Everyone picks a score from 1 to 9 and a trend.',
    },
    youVote: 'You take part in the vote',
    youDontVote: "You don't take part in the vote",
    categoryMinutes: 'Time per category (minutes)',
    minutesInvalid: (min: number, max: number) => `Enter a whole number of minutes from ${min} to ${max}.`,
  },

  timer: {
    label: 'Time on this category',
    over: 'Time on this category, past the time slot',
    farOver: 'Time on this category, well past the time slot',
  },

  editor: {
    name: 'Category name',
    languages: 'Language',
    nameMissing: 'Enter a category name.',
    lengthHint: 'Keep each description under 100 characters so it reads at a glance.',
    positive: '🟢 Positive description (green)',
    negative: '🔴 Negative description (red)',
    positiveMissing: 'Describe what a healthy (green) state looks like.',
    negativeMissing: 'Describe what an unhealthy (red) state looks like.',
    addTitle: 'Add New Category',
    add: 'Add Category',
    reset: 'Reset to default',
    edit: (name: string) => `Edit ${name}`,
    remove: (name: string) => `Remove ${name}`,
    timeHint: (categories: number) => `${categories} ${categories !== 1 ? 'categories' : 'category'} to tackle`,
    timeExample: (total: string, voters: number) => `= ~${total} for ${voters} voters`,
    suggestions: 'Suggested categories',
    addSuggestion: (name: string) => `Add ${name}`,
    deleteSuggestion: (name: string) => `Delete ${name} for good`,
    list: 'Session categories',
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
    moved: (name: string, position: number, total: number) => `${name} moved to position ${position} of ${total}`,
    added: (name: string) => `${name} added`,
    removed: (name: string) => `${name} removed`,
  },

  join: {
    title: 'Join Session',
    session: 'Session:',
    yourName: 'Your name',
    nameMissing: 'Enter your name to join the session.',
    button: 'Join',
  },

  lobby: {
    sessionCode: 'Session Code',
    qrTitle: 'Scan to join the session',
    scanToJoin: 'Scan to join',
    shareLink: 'Share link',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    participants: (n: number) => `Participants (${n})`,
    you: ' (You)',
    facilitator: ', facilitator',
    categoriesToReview: (n: number) =>
      `${n} ${n !== 1 ? 'categories' : 'category'} to review`,
    waiting: 'Waiting for the facilitator to start the session…',
  },

  voting: {
    sessionProgress: 'Session progress',
    healthColor: 'Health Color',
    trend: 'Trend',
    pickColor: 'Pick a health color.',
    pickTrend: 'Pick a trend.',
    score: 'Score',
    scoreLabel: 'Health score from 1 to 9',
    pickScore: 'Pick a score from 1 to 9.',
    scoreNone: 'Move the slider to pick a score',
    scoreValue: (n: number) => `${n} out of 9`,
    scaleLow: 'Score 1',
    scaleHigh: 'Score 9',
    submit: 'Submit Vote',
    update: 'Update Vote',
    cancelEdit: 'Cancel',
    edit: 'Edit my vote',
    submitted: 'Vote submitted!',
    votesReceivedLabel: 'Votes received',
    revealNowCount: (n: number, total: number) => `Reveal Votes Now (${n}/${total})`,
  },

  results: {
    next: 'Next Category',
    finish: 'Finish Session',
    noVotes: 'No votes',
    medianPrefix: 'Median:',
    median: 'median',
    histogramCaption: 'Votes by score',
    trendsCaption: 'Votes by trend',
    scoreOutOf: (n: string) => `${n} / 9`,
    byPerson: 'Votes',
    matrixCaption: 'Votes by health colour and trend',
    descriptions: 'Health descriptions',
    unknownVoter: 'Former participant',
  },

  funStats: {
    title: 'Fun facts of this health check',
    sunnySide: stat('Sunny Side', ({ category }) => `${category} had the healthiest median of the check.`),
    stormCloud: stat('Storm Cloud', ({ category }) => `${category} had the lowest median of the check.`),
    hotDebate: stat('Hot Debate', ({ category }) => `${category} split the room the most.`),
    choir: stat('Singing in Harmony', ({ category }) => `${category} is where the team came closest to agreeing.`),
    greenParty: stat('Green Party', ({ category, value }) => `${value} of the votes on ${category} were green.`),
    redAlert: stat('Red Alert', ({ category, value }) => `${value} of the votes on ${category} were red.`),
    teamMood: stat('Team Mood', ({ value }) => `${value} of all votes were green.`),
    lookingUp: stat('Looking Up', ({ value }) => `${value} of all votes said things are improving.`),
    slidingDown: stat('Slippery Slope', ({ category, value }) => `${category} got ${value} "getting worse" votes, more than any other category.`),
    risingStar: stat('Rising Star', ({ category, value }) => `${category} got ${value} "improving" votes, more than any other category.`),
    flawless: stat('Flawless', ({ category }) => `Everyone voted green on ${category}.`),
    splitRoom: stat('Two Worlds', ({ value }) => `${value} categories got both green and red votes.`),
    redFree: stat('Red-Free Zone', () => 'Not a single red vote in the whole health check.'),
    steady: stat('Steady as She Goes', ({ value }) => `${value} of all votes said things are stable.`),
    voiceCount: stat('Many Voices', ({ value, category }) => `${value} votes cast across ${category} categories.`),
    pessimisticPal: stat('Pessimistic Pal', ({ name, value }) => `${name} saw the clouds most often: ${value} votes were orange or red.`),
    optimisticOtter: stat('Optimistic Otter', ({ name, value }) => `${name} saw the bright side: ${value} votes were green.`),
    devilsAdvocate: stat("Devil's Advocate", ({ name }) => `${name} voted furthest from the rest of the team, on average.`),
    teamMirror: stat('Team Mirror', ({ name }) => `${name} voted closest to the team's median.`),
    blackOrWhite: stat('Black or White', ({ name, value }) => `${name} went for green or red in ${value} of their votes, rarely anything in between.`),
    fenceSitter: stat('Fence Sitter', ({ name, value }) => `${name} picked orange in ${value} votes.`),
    stormChaser: stat('Storm Chaser', ({ name, value }) => `${name} raised ${value} red flags.`),
    greenThumb: stat('Green Thumb', ({ name, value }) => `${name} gave ${value} green votes.`),
    worrier: stat('Cassandra', ({ name, value }) => `${name} saw things getting worse ${value} times.`),
    believer: stat('True Believer', ({ name, value }) => `${name} saw things improving ${value} times.`),
    creatureOfHabit: stat('Creature of Habit', ({ name, color, value }) => `${name} voted ${color?.toLowerCase()} in ${value} votes.`),
    quickestDraw: stat('Quickest Draw', ({ name, value }) => `${name} voted the fastest: ${value} on average.`),
    deepThinker: stat('Deep Thinker', ({ name, value }) => `${name} took the most time to decide: ${value} on average.`),
    lightning: stat('Lightning Strike', ({ name, category, value }) => `${name} voted on ${category} after only ${value}.`),
    firstResponder: stat('First Responder', ({ name, value }) => `${name} was the first to vote ${value} times.`),
    fashionablyLate: stat('Fashionably Late', ({ name, value }) => `${name} was the last to vote ${value} times.`),
    inSync: stat('In Sync', ({ category, value }) => `On ${category}, all the votes came within ${value} of each other.`),
    slowBurner: stat('Slow Burner', ({ category, value }) => `On ${category}, ${value} passed between the first and the last vote.`),
    teamAverage: stat('Team Average', ({ value }) => `The average score of the whole health check was ${value}.`),
    topMarks: stat('Top Marks', ({ category, value }) => `${category} collected ${value} scores of 9, more than any other category.`),
    rockBottom: stat('Rock Bottom', ({ category, value }) => `${category} collected ${value} scores of 1, more than any other category.`),
    bullseye: stat('Bullseye', ({ category, value }) => `Everyone gave ${value} on ${category}.`),
    rubberBand: stat('Rubber Band', ({ category, value }) => `Scores on ${category} stretched from ${value}.`),
    highFloor: stat('High Floor', ({ value }) => `Nobody scored below ${value} in the whole health check.`),
    sunnyAverage: stat('Sunny Average', ({ name, value }) => `${name} scored highest on average: ${value}.`),
    gloomyAverage: stat('Gloomy Average', ({ name, value }) => `${name} scored lowest on average: ${value}.`),
    allOrNothing: stat('All or Nothing', ({ name, value }) => `${name} went for a 1 or a 9 in ${value} votes.`),
    middleGround: stat('Middle Ground', ({ name, value }) => `${name} picked a 5 in ${value} votes.`),
    nineLives: stat('Nine Lives', ({ name, value }) => `${name} gave ${value} scores of 9.`),
    oneTrickPony: stat('One-Trick Pony', ({ name, score, value }) => `${name} gave ${score} in ${value} of their votes.`),
    rollercoaster: stat('Rollercoaster', ({ name, value }) => `${name}'s scores ranged from ${value}.`),
  },

  finished: {
    title: 'Session Complete!',
    intro: "Here's the summary of all results from the health check.",
    participantIntro: 'Thanks for taking part! The summary is on the shared screen.',
  },

  presenter: {
    open: 'Presenter window',
    openNewWindow: 'Presenter window (opens a new window)',
    hint: 'Share the presenter window with the team and keep this one to yourself.',
    allowPopups: 'Allow pop-ups for this site to open the presenter window.',
    documentTitle: (code: string) => `Presenter — ${code}`,
    onlyFacilitator: 'Only the facilitator can open the presenter view',
    joinTitle: 'Join the health check',
  },

  intro: {
    title: 'Introduction',
    what: 'A quick look at how the squad is doing. For each category, everyone picks a health colour and a trend, then we discuss the results together.',
    scaleTitle: 'Health scale',
    whatRange: 'A quick look at how the squad is doing. For each category, everyone picks a score from 1 to 9 and a trend, then we discuss the results together.',
    scaleHint: 'Score 1 is the lowest, 9 the highest.',
    colorsTitle: 'Health colours',
    trendsTitle: 'Trend',
    trendsHint: 'Compared with how things were recently.',
    /** Sentence split around its bold part: [before, bold, after] */
    categoryCount: (n: number): [string, string, string] => [
      'We have ',
      `${n} ${n !== 1 ? 'categories' : 'category'}`,
      ' to tackle together.',
    ],
    anonymity: {
      off: 'Votes are named: everyone sees who voted what once each round is revealed.',
      facilitator: 'Votes are anonymous to the team; only the facilitator sees who voted what.',
      full: 'Votes are anonymous: results only show totals.',
    },
  },
  participant: {
    waitingOthers: 'Waiting for the others…',
    resultsOnScreen: 'The results are on the shared screen.',
    ready: "I'm ready for the next category",
    readyDone: "You're ready. The facilitator moves on when everyone is.",
    notReady: 'Not ready yet',
  },
  facilitator: {
    startWorkshop: (n: number) => `Start workshop (${plural(n, 'voter')})`,
    needVoter: 'At least one person must vote before the workshop can start.',
    introHint: 'The introduction is on the shared screen. Start the first category when the team is ready.',
    introScriptTitle: 'Introduction to read out',
    introScript: [
      "Thanks for joining this Squad Health Check. It's a quick, honest look at how we feel about our work. It's not an evaluation, and there are no wrong answers.",
      "For each category, vote on your phone with a colour and a trend (improving, stable or getting worse).",
      "Green doesn't mean perfect: it just means we're happy with how things are and see no need to improve right now. Orange means there are significant problems to address, but it's not a disaster. Red means it really isn't working and needs to improve quickly.",
    ],
    introScriptEnd: "After each vote, we'll discuss the results, especially where we disagree. Let's start!",
    startFirst: 'Start first category',
    voted: 'voted',
    waiting: 'waiting',
    disconnected: 'disconnected',
    quickVote: 'voted in under 2 seconds',
    ready: 'ready to move on',
    notReady: 'not ready yet',
    readyCount: (n: number, total: number) => `Ready to move on: ${n} of ${total}`,
    disconnectedHint: (names: string) => `Disconnected: ${names}. Reveal the votes once the others have voted.`,
    allNotes: 'Notes per category',
    loadingNotes: 'Loading notes…',
    offlineHint: 'Use + and − to count the votes of people in the room who are not connected.',
    offlineCount: (n: number) => `Including ${plural(n, 'vote')} you added.`,
    addOfflineVote: (color: string, trend: string) => `Add a vote: ${color}, ${trend}`,
    removeOfflineVote: (color: string, trend: string) => `Remove a vote you added: ${color}, ${trend}`,
    offlineInCell: (n: number) => `${plural(n, 'vote')} added manually`,
    resetOffline: 'Reset manual votes',
    addOfflineScore: (score: number, trend: string) => `Add a vote: ${score}, ${trend}`,
    removeOfflineScore: (score: number, trend: string) => `Remove a vote you added: ${score}, ${trend}`,
    offlineScoreInCell: (n: number) => `${plural(n, 'vote')} added manually`,
    offlineTrend: 'Trend of the votes you add',
  },

  notes: {
    backToSession: 'Back to the session',
    privacy: 'Only you can see these notes. Keep this window out of your screen share.',
    downloadMarkdown: 'Download Markdown',
    downloadPdf: 'Download PDF',
    downloadJson: 'Download JSON',
    previousTitle: 'Compare with a previous session',
    previousHint: 'Import the JSON file downloaded at the end of a past session to see how each category has changed.',
    importPrevious: 'Import JSON file',
    changePrevious: 'Use another file',
    comparedWith: (date: string) => `Comparing with the session of ${date}`,
    removePrevious: 'Stop comparing',
    invalidImport: 'This file is not a Squad Health Check JSON export.',
    previous: 'Previous:',
    evolution: { better: 'Better', same: 'Same', worse: 'Worse' },
    discussion: 'Discussion notes',
    placeholder: 'Write down key discussion points…',
  },

  errors: {
    notAllowed: 'Not allowed — the session may have changed. Try reloading.',
    generic: 'Something went wrong. Check your connection and try again.',
    createFailed: 'Could not create a session. Please try again.',
    sessionFull: (max: number) => `This session is full (${max} participants maximum).`,
  },

  report: {
    category: 'Category',
    votes: 'Votes',
    median: 'Median',
    notes: 'Notes',
    voters: (n: number) => `Voters: ${n}`,
    medianOf: (median: string) => `Median: ${median}`,
    scoresLine: (parts: string) => `Scores: ${parts}`,
    trendsLine: (parts: string) => `Trends: ${parts}`,
  },
};

export type Messages = typeof en;

const fr: Messages = {
  mandatory: ' - obligatoire',
  save: 'Enregistrer',
  cancel: 'Annuler',
  codeLabel: 'Code :',
  votes: (n) => pluralFr(n, 'vote'),
  votesReceived: (n, total) => `${n} / ${total} votes reçus`,
  categoryOf: (i, n) => `Catégorie ${i} sur ${n}`,
  categoryPosition: (i, n) => `catégorie ${i} sur ${n}`,
  loadingResults: 'Chargement des résultats…',
  backToHome: "Retour à l'accueil",
  sessionNotFound: 'Session introuvable',
  connecting: 'Connexion à la session…',
  reconnecting: 'Reconnexion…',
  switchLang: 'Switch to English',
  skipToContent: 'Aller au contenu principal',
  pageTitle: (page) => (page ? `${page} – Squad Health Check` : 'Squad Health Check'),
  sessionTitle: (code) => `Session ${code}`,

  colors: { green: 'Vert', orange: 'Orange', red: 'Rouge' },
  colorFallbacks: {
    green: "Pas parfait, mais nous sommes satisfaits ainsi et ne voyons pas de besoin d'amélioration pour l'instant.",
    orange: "Des problèmes importants à traiter, mais ce n'est pas une catastrophe.",
    red: "Ça ne fonctionne vraiment pas et doit être amélioré très rapidement.",
  },
  trends: { up: 'En amélioration', stable: 'Stable', down: 'En dégradation' },

  home: {
    welcome: 'Squad Health Check',
    intro:
      "Faites le bilan de santé de votre équipe.",
    createTitle: 'Créer une session',
    createText: 'Configurez les catégories et invitez votre équipe',
    createButton: 'Créer la session',
    joinTitle: 'Rejoindre une session',
    sessionCode: 'Code de session',
    codePlaceholder: 'Code de session',
    codeHelper: 'ex. CLEVER',
    codeMissing: 'Saisissez le code de session partagé par votre facilitateur.',
    joinButton: 'Rejoindre la session',
    howItWorks: 'Comment ça marche',
    steps: [
      {
        title: 'Préparer et inviter',
        text: 'Le facilitateur prépare la session, choisit les catégories, puis partage le code, le lien ou le QR code.',
      },
      {
        title: 'Voter',
        text: 'Pour chaque catégorie, chacun choisit une couleur et une tendance. Les votes restent cachés jusqu\'à ce que la manche soit révélée.',
      },
      {
        title: 'Discuter',
        text: "Les résultats, la médiane et la comparaison avec la dernière fois s'affichent sur l'écran partagé. Discutez-en, surtout là où les votes divergent.",
      },
      {
        title: 'Garder une trace',
        text: 'Téléchargez le récapitulatif en Markdown, PDF ou JSON. La prochaine fois, le JSON permet de comparer avec cette session.',
      },
    ],
  },

  create: {
    title: 'Créer une session',
    intro: 'Personnalisez les catégories de votre bilan, puis lancez la session.',
    noCategories: 'Ajoutez au moins une catégorie avant de lancer la session.',
    start: 'Lancer la session',
  },

  settings: {
    title: 'Paramètres de la session',
    facilitatorVotes: 'Je participe au vote',
    anonymity: 'Anonymisation des votes',
    levels: { off: 'Désactivée (recommandé)', facilitator: 'Facilitateur uniquement', full: 'Complète' },
    levelHints: {
      off: "Tout le monde voit qui a voté quoi une fois la manche révélée.",
      facilitator: "Vous seul voyez qui a voté quoi une fois la manche révélée ; l'équipe voit les totaux.",
      full: 'Personne ne voit qui a voté quoi, seulement les totaux.',
    },
    voteMode: 'Mode de vote',
    voteModes: { colors: 'Couleurs', range: 'Échelle (1 à 9)' },
    voteModeHints: {
      colors: 'Chacun choisit une couleur de santé (vert, orange ou rouge) et une tendance.',
      range: 'Chacun choisit une note de 1 à 9 et une tendance.',
    },
    youVote: 'Vous participez au vote',
    youDontVote: 'Vous ne participez pas au vote',
    categoryMinutes: 'Temps par catégorie (minutes)',
    minutesInvalid: (min, max) => `Saisissez un nombre entier de minutes entre ${min} et ${max}.`,
  },

  timer: {
    label: 'Temps passé sur cette catégorie',
    over: 'Temps passé sur cette catégorie, au-delà du créneau prévu',
    farOver: 'Temps passé sur cette catégorie, bien au-delà du créneau prévu',
  },

  editor: {
    name: 'Nom de la catégorie',
    languages: 'Langue',
    nameMissing: 'Saisissez un nom de catégorie.',
    lengthHint: 'Gardez chaque description sous 100 caractères pour une lecture rapide.',
    positive: '🟢 Description positive (vert)',
    negative: '🔴 Description négative (rouge)',
    positiveMissing: 'Décrivez à quoi ressemble un état sain (vert).',
    negativeMissing: 'Décrivez à quoi ressemble un état problématique (rouge).',
    addTitle: 'Nouvelle catégorie',
    add: 'Ajouter une catégorie',
    reset: 'Revenir aux catégories par défaut',
    edit: (name) => `Modifier ${name}`,
    remove: (name) => `Supprimer ${name}`,
    timeHint: (categories) => `${categories} catégorie${categories !== 1 ? 's' : ''} à traiter`,
    timeExample: (total, voters) => `= ~${total} pour ${voters} votants`,
    suggestions: 'Catégories suggérées',
    addSuggestion: (name) => `Ajouter ${name}`,
    deleteSuggestion: (name) => `Supprimer définitivement ${name}`,
    list: 'Catégories de la session',
    moveUp: (name) => `Monter ${name}`,
    moveDown: (name) => `Descendre ${name}`,
    moved: (name, position, total) => `« ${name} » est maintenant en position ${position} sur ${total}`,
    added: (name) => `Catégorie « ${name} » ajoutée`,
    removed: (name) => `Catégorie « ${name} » retirée`,
  },

  join: {
    title: 'Rejoindre la session',
    session: 'Session :',
    yourName: 'Votre nom',
    nameMissing: 'Saisissez votre nom pour rejoindre la session.',
    button: 'Rejoindre',
  },

  lobby: {
    sessionCode: 'Code de session',
    qrTitle: 'Scannez pour rejoindre la session',
    scanToJoin: 'Scannez pour rejoindre',
    shareLink: 'Lien de partage',
    copyLink: 'Copier le lien',
    linkCopied: 'Lien copié',
    participants: (n) => `Participants (${n})`,
    you: ' (vous)',
    facilitator: ', facilitateur',
    categoriesToReview: (n) => `${n} catégorie${n !== 1 ? 's' : ''} à passer en revue`,
    waiting: 'En attente du lancement de la session par le facilitateur…',
  },

  voting: {
    sessionProgress: 'Progression de la session',
    healthColor: 'Couleur',
    trend: 'Tendance',
    pickColor: 'Choisissez une couleur.',
    pickTrend: 'Choisissez une tendance.',
    score: 'Note',
    scoreLabel: 'Note de santé de 1 à 9',
    pickScore: 'Choisissez une note de 1 à 9.',
    scoreNone: 'Déplacez le curseur pour choisir une note',
    scoreValue: (n) => `${n} sur 9`,
    scaleLow: 'Note 1',
    scaleHigh: 'Note 9',
    submit: 'Voter',
    update: 'Modifier le vote',
    cancelEdit: 'Annuler',
    edit: 'Modifier mon vote',
    submitted: 'Vote envoyé !',
    votesReceivedLabel: 'Votes reçus',
    revealNowCount: (n, total) => `Révéler les votes (${n}/${total})`,
  },

  results: {
    next: 'Catégorie suivante',
    finish: 'Terminer la session',
    noVotes: 'Aucun vote',
    medianPrefix: 'Médiane :',
    median: 'médiane',
    histogramCaption: 'Votes par note',
    trendsCaption: 'Votes par tendance',
    scoreOutOf: (n) => `${n} / 9`,
    byPerson: 'Votes',
    matrixCaption: 'Votes par couleur de santé et tendance',
    descriptions: 'Description des couleurs',
    unknownVoter: 'Ancien participant',
  },

  funStats: {
    title: 'Les anecdotes de ce bilan',
    sunnySide: stat('Côté soleil', ({ category }) => `${category} a obtenu la meilleure médiane du bilan.`),
    stormCloud: stat('Nuage noir', ({ category }) => `${category} a obtenu la médiane la plus basse du bilan.`),
    hotDebate: stat('Débat animé', ({ category }) => `${category} est la catégorie qui a le plus divisé la salle.`),
    choir: stat("Tous d'accord", ({ category }) => `${category} est la catégorie où l'équipe était le plus proche d'être unanime.`),
    greenParty: stat('Fête en vert', ({ category, value }) => `${value} des votes sur ${category} étaient verts.`),
    redAlert: stat('Alerte rouge', ({ category, value }) => `${value} des votes sur ${category} étaient rouges.`),
    teamMood: stat("Moral de l'équipe", ({ value }) => `${value} de tous les votes étaient verts.`),
    lookingUp: stat('Ça va mieux', ({ value }) => `${value} de tous les votes disaient que ça s'améliore.`),
    slidingDown: stat('Pente glissante', ({ category, value }) => `${category} a reçu ${value} votes « en dégradation », plus que toute autre catégorie.`),
    risingStar: stat('Étoile montante', ({ category, value }) => `${category} a reçu ${value} votes « en amélioration », plus que toute autre catégorie.`),
    flawless: stat('Sans faute', ({ category }) => `Tout le monde a voté vert sur ${category}.`),
    splitRoom: stat('Deux mondes', ({ value }) => `${value} catégories ont reçu à la fois des votes verts et rouges.`),
    redFree: stat('Zone sans rouge', () => 'Pas un seul vote rouge dans tout le bilan.'),
    steady: stat('Cap maintenu', ({ value }) => `${value} de tous les votes disaient que la situation est stable.`),
    voiceCount: stat('Beaucoup de voix', ({ value, category }) => `${value} votes exprimés sur ${category} catégories.`),
    pessimisticPal: stat('Pessimiste du jour', ({ name, value }) => `${name} a vu les nuages le plus souvent : ${value} votes orange ou rouges.`),
    optimisticOtter: stat('Optimiste du jour', ({ name, value }) => `${name} a vu le bon côté des choses : ${value} votes verts.`),
    devilsAdvocate: stat('Avocat du diable', ({ name }) => `${name} a voté le plus loin du reste de l'équipe, en moyenne.`),
    teamMirror: stat("Miroir de l'équipe", ({ name }) => `${name} a voté au plus près de la médiane de l'équipe.`),
    blackOrWhite: stat('Noir ou blanc', ({ name, value }) => `${name} a choisi vert ou rouge dans ${value} de ses votes, rarement entre les deux.`),
    fenceSitter: stat('Entre deux chaises', ({ name, value }) => `${name} a choisi orange dans ${value} votes.`),
    stormChaser: stat('Chasseur de tempêtes', ({ name, value }) => `${name} a levé ${value} drapeaux rouges.`),
    greenThumb: stat('Main verte', ({ name, value }) => `${name} a donné ${value} votes verts.`),
    worrier: stat('Cassandre', ({ name, value }) => `${name} a vu les choses se dégrader ${value} fois.`),
    believer: stat('Éternel optimiste', ({ name, value }) => `${name} a vu les choses s'améliorer ${value} fois.`),
    creatureOfHabit: stat("Homme d'habitudes", ({ name, color, value }) => `${name} a voté ${color?.toLowerCase()} dans ${value} votes.`),
    quickestDraw: stat('Plus rapide que son ombre', ({ name, value }) => `${name} a voté le plus vite : ${value} en moyenne.`),
    deepThinker: stat('Grand penseur', ({ name, value }) => `${name} a pris le plus de temps pour se décider : ${value} en moyenne.`),
    lightning: stat('Coup de foudre', ({ name, category, value }) => `${name} a voté sur ${category} en seulement ${value}.`),
    firstResponder: stat('Premier arrivé', ({ name, value }) => `${name} a voté en premier ${value} fois.`),
    fashionablyLate: stat('Toujours le dernier', ({ name, value }) => `${name} a voté en dernier ${value} fois.`),
    inSync: stat('À l’unisson', ({ category, value }) => `Sur ${category}, tous les votes sont arrivés à ${value} d'écart.`),
    slowBurner: stat('Longue réflexion', ({ category, value }) => `Sur ${category}, ${value} se sont écoulées entre le premier et le dernier vote.`),
    teamAverage: stat('Moyenne de la team', ({ value }) => `La note moyenne de tout le bilan est de ${value}.`),
    topMarks: stat('Pleins feux', ({ category, value }) => `${category} a récolté ${value} notes de 9, plus que toute autre catégorie.`),
    rockBottom: stat('Tout en bas', ({ category, value }) => `${category} a récolté ${value} notes de 1, plus que toute autre catégorie.`),
    bullseye: stat('En plein dans le mille', ({ category, value }) => `Tout le monde a mis ${value} sur ${category}.`),
    rubberBand: stat('Élastique', ({ category, value }) => `Les notes sur ${category} s'étalent de ${value}.`),
    highFloor: stat('Plancher haut', ({ value }) => `Personne n'a mis moins de ${value} sur tout le bilan.`),
    sunnyAverage: stat('Moyenne ensoleillée', ({ name, value }) => `${name} a mis les meilleures notes en moyenne : ${value}.`),
    gloomyAverage: stat('Moyenne grisouille', ({ name, value }) => `${name} a mis les notes les plus basses en moyenne : ${value}.`),
    allOrNothing: stat('Tout ou rien', ({ name, value }) => `${name} a choisi un 1 ou un 9 dans ${value} votes.`),
    middleGround: stat('Juste milieu', ({ name, value }) => `${name} a mis un 5 dans ${value} votes.`),
    nineLives: stat('Neuf vies', ({ name, value }) => `${name} a donné ${value} notes de 9.`),
    oneTrickPony: stat('Une seule note', ({ name, score, value }) => `${name} a donné ${score} dans ${value} de ses votes.`),
    rollercoaster: stat('Montagnes russes', ({ name, value }) => `Les notes de ${name} vont de ${value}.`),
  },

  finished: {
    title: 'Session terminée !',
    intro: 'Voici le récapitulatif de tous les résultats du bilan.',
    participantIntro: "Merci pour votre participation ! Le récapitulatif est sur l'écran partagé.",
  },

  presenter: {
    open: 'Fenêtre de présentation',
    openNewWindow: "Fenêtre de présentation (s'ouvre dans une nouvelle fenêtre)",
    hint: "Partagez la fenêtre de présentation avec l'équipe et gardez celle-ci pour vous.",
    allowPopups: "Autorisez les pop-ups pour ce site afin d'ouvrir la fenêtre de présentation.",
    documentTitle: (code) => `Présentation — ${code}`,
    onlyFacilitator: 'Seul le facilitateur peut ouvrir la vue de présentation',
    joinTitle: 'Rejoignez le Squad Health Check',
  },

  intro: {
    title: 'Introduction',
    what: "Un rapide tour de l'état de la squad. Pour chaque catégorie, chacun choisit une couleur et une tendance, puis nous discutons ensemble des résultats.",
    scaleTitle: 'Échelle de santé',
    whatRange: "Un rapide tour de l'état de la squad. Pour chaque catégorie, chacun choisit une note de 1 à 9 et une tendance, puis nous discutons ensemble des résultats.",
    scaleHint: 'La note 1 est la plus basse, 9 la plus haute.',
    colorsTitle: 'Couleurs de santé',
    trendsTitle: 'Tendance',
    trendsHint: 'Par rapport à la situation récente.',
    categoryCount: (n) => [
      'Nous avons ',
      `${n}`,
      ` catégorie${n !== 1 ? 's' : ''} à aborder ensemble.`,
    ],
    anonymity: {
      off: 'Les votes sont nominatifs : tout le monde voit qui a voté quoi une fois chaque manche révélée.',
      facilitator: "Les votes sont anonymes pour l'équipe ; seul le facilitateur voit qui a voté quoi.",
      full: 'Les votes sont anonymes : les résultats ne montrent que des totaux.',
    },
  },
  participant: {
    waitingOthers: 'En attente des autres…',
    resultsOnScreen: "Les résultats sont sur l'écran partagé.",
    ready: 'Je suis prêt(e) pour la catégorie suivante',
    readyDone: "Vous êtes prêt(e). L'animateur passe à la suite quand tout le monde l'est.",
    notReady: 'Pas encore prêt(e)',
  },
  facilitator: {
    startWorkshop: (n) => `Lancer l'atelier (${n} votant${n !== 1 ? 's' : ''})`,
    needVoter: "Au moins une personne doit voter pour lancer l'atelier.",
    introHint: "L'introduction est sur l'écran partagé. Lancez la première catégorie quand l'équipe est prête.",
    introScriptTitle: "Introduction à lire",
    introScript: [
      "Merci de participer à ce Squad Health Check. C'est un regard rapide et honnête sur la façon dont nous vivons notre travail. Ce n'est pas une évaluation, et il n'y a pas de mauvaise réponse.",
      "Pour chaque catégorie, votez sur votre téléphone avec une couleur et une tendance (en amélioration, stable ou en dégradation).",
      "Vert ne veut pas dire parfait : cela signifie simplement que nous sommes satisfaits ainsi et ne voyons pas de besoin d'amélioration pour l'instant. Orange signifie qu'il y a des problèmes importants à traiter, mais ce n'est pas une catastrophe. Rouge signifie que ça ne fonctionne vraiment pas et que cela doit être amélioré très rapidement.",
    ],
    introScriptEnd: "Après chaque vote, nous discuterons des résultats, surtout là où nous ne sommes pas d'accord. C'est parti !",
    startFirst: 'Lancer la première catégorie',
    voted: 'a voté',
    waiting: 'en attente',
    disconnected: 'hors ligne',
    quickVote: 'a voté en moins de 2 secondes',
    ready: 'prêt(e) à passer à la suite',
    notReady: 'pas encore prêt(e)',
    readyCount: (n, total) => `Prêts à passer à la suite : ${n} sur ${total}`,
    disconnectedHint: (names) => `Hors ligne : ${names}. Révélez les votes une fois que les autres ont voté.`,
    allNotes: 'Notes par catégorie',
    loadingNotes: 'Chargement des notes…',
    offlineHint: 'Utilisez + et − pour compter les votes des personnes présentes mais non connectées.',
    offlineCount: (n) => `Dont ${pluralFr(n, 'vote')} ajouté${n > 1 ? 's' : ''} par vous.`,
    addOfflineVote: (color, trend) => `Ajouter un vote : ${color}, ${trend}`,
    removeOfflineVote: (color, trend) => `Retirer un vote ajouté : ${color}, ${trend}`,
    offlineInCell: (n) => `${pluralFr(n, 'vote')} ajouté${n > 1 ? 's' : ''} manuellement`,
    resetOffline: 'Réinitialiser les votes manuels',
    addOfflineScore: (score, trend) => `Ajouter un vote : ${score}, ${trend}`,
    removeOfflineScore: (score, trend) => `Retirer un vote ajouté : ${score}, ${trend}`,
    offlineScoreInCell: (n) => `${pluralFr(n, 'vote')} ajouté${n > 1 ? 's' : ''} manuellement`,
    offlineTrend: 'Tendance des votes ajoutés',
  },

  notes: {
    backToSession: 'Retour à la session',
    privacy: "Vous seul voyez ces notes. Gardez cette fenêtre hors de votre partage d'écran.",
    downloadMarkdown: 'Télécharger le Markdown',
    downloadPdf: 'Télécharger le PDF',
    downloadJson: 'Télécharger le JSON',
    previousTitle: 'Comparer avec une session précédente',
    previousHint: "Importez le fichier JSON téléchargé à la fin d'une session passée pour voir l'évolution de chaque catégorie.",
    importPrevious: 'Importer le fichier JSON',
    changePrevious: 'Choisir un autre fichier',
    comparedWith: (date) => `Comparaison avec la session du ${date}`,
    removePrevious: 'Ne plus comparer',
    invalidImport: "Ce fichier n'est pas un export JSON Squad Health Check.",
    previous: 'Précédente :',
    evolution: { better: 'Mieux', same: 'Pareil', worse: 'Moins bien' },
    discussion: 'Notes de discussion',
    placeholder: 'Notez les points clés de la discussion…',
  },

  errors: {
    notAllowed: 'Action refusée — la session a peut-être changé. Rechargez la page.',
    generic: 'Une erreur est survenue. Vérifiez votre connexion et réessayez.',
    createFailed: 'Impossible de créer la session. Veuillez réessayer.',
    sessionFull: (max) => `Cette session est complète (${max} participants maximum).`,
  },

  report: {
    category: 'Catégorie',
    votes: 'Votes',
    median: 'Médiane',
    notes: 'Notes',
    voters: (n: number) => `Nombre de votants : ${n}`,
    medianOf: (median: string) => `Médiane : ${median}`,
    scoresLine: (parts: string) => `Notes : ${parts}`,
    trendsLine: (parts: string) => `Tendances : ${parts}`,
  },
};

export const messagesFor = (lang: Lang): Messages => (lang === 'fr' ? fr : en);

/** Messages in the current language; a live binding swapped by switchLang */
export let t = messagesFor(LANG);
