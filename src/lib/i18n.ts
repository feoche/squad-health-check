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

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

const en = {
  mandatory: ' - mandatory',
  save: 'Save',
  cancel: 'Cancel',
  code: (code: string) => `Code: ${code}`,
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

  colors: { green: 'Green', orange: 'Orange', red: 'Red' },
  colorFallbacks: {
    green: 'All good: we are happy with how things are.',
    orange: 'Some problems, but nothing alarming.',
    red: 'Things are not working: this needs fixing.',
  },
  trends: { up: 'Improving', stable: 'Stable', down: 'Getting worse' },

  home: {
    welcome: 'Squad Health Check',
    intro:
      "Run anonymous health check sessions with your team. Vote on categories, discuss results, and track your squad's well-being.",
    createTitle: 'Create a New Session',
    createText: 'Set up categories and invite your team',
    createButton: 'Create Session',
    joinTitle: 'Join a Session',
    sessionCode: 'Session code',
    codePlaceholder: 'e.g. ABC123',
    codeMissing: 'Enter the session code shared by your facilitator.',
    joinButton: 'Join Session',
    howItWorks: 'How it works',
    steps: [
      'The facilitator creates a session and shares the code / link',
      'Team members join using their name',
      'For each category, everyone votes a health color (green, orange, red) and a trend (improving, stable, worsening)',
      'Votes are anonymous — results show only aggregate counts',
      'After all votes are in, discuss as a team',
      'Download a recap (Markdown + PDF) at the end',
    ],
  },

  create: {
    title: 'Create New Session',
    intro: 'Customise the categories for your health check, then start the session.',
    noCategories: 'Add at least one category before starting the session.',
    start: (n: number) => `Start Session (${n} ${n !== 1 ? 'categories' : 'category'})`,
  },

  editor: {
    name: 'Category name',
    nameFr: 'French name',
    nameMissing: 'Enter a category name.',
    lengthHint: 'Keep each description under 100 characters so it reads at a glance.',
    positive: '🟢 Positive description (green)',
    mixed: '🟠 Mixed description (orange)',
    negative: '🔴 Negative description (red)',
    positiveFr: '🟢 Positive description in French',
    mixedFr: '🟠 Mixed description in French',
    negativeFr: '🔴 Negative description in French',
    positiveMissing: 'Describe what a healthy (green) state looks like.',
    mixedMissing: 'Describe what a mixed (orange) state looks like.',
    negativeMissing: 'Describe what an unhealthy (red) state looks like.',
    addTitle: 'Add New Category',
    add: 'Add Category',
    edit: (name: string) => `Edit ${name}`,
    remove: (name: string) => `Remove ${name}`,
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
    submit: 'Submit Vote',
    update: 'Update Vote',
    cancelEdit: 'Cancel',
    edit: 'Edit my vote',
    submitted: 'Vote submitted!',
    votesReceivedLabel: 'Votes received',
    revealNowCount: (n: number, total: number) => `Reveal Votes Now (${n}/${total})`,
  },

  results: {
    title: (n: number) => `Results (${plural(n, 'vote')})`,
    next: 'Next Category',
    finish: 'Finish Session',
    noVotes: 'No votes',
    mostly: 'Mostly',
  },

  finished: {
    title: 'Session Complete!',
    intro: "Here's the summary of all results from the health check.",
    participantIntro: 'Thanks for taking part! The summary is on the shared screen.',
  },

  presenter: {
    open: 'Presenter window',
    hint: 'Share the presenter window with the team and keep this one to yourself.',
    allowPopups: 'Allow pop-ups for this site to open the presenter window.',
    documentTitle: (code: string) => `Presenter — ${code}`,
    onlyFacilitator: 'Only the facilitator can open the presenter view',
    joinTitle: 'Join the health check',
  },

  intro: {
    title: 'Squad Health Check',
    what: 'A quick look at how the squad is doing. For each category, everyone picks a health colour and a trend, then we discuss the results together.',
    colorsTitle: 'Health colours',
    trendsTitle: 'Trend',
    trendsHint: 'Compared with how things were recently.',
    /** Sentence split around its bold part: [before, bold, after] */
    categoryCount: (n: number): [string, string, string] => [
      'We have ',
      `${n} ${n !== 1 ? 'categories' : 'category'}`,
      ' to tackle together.',
    ],
  },
  participant: {
    waitingOthers: 'Waiting for the others…',
    resultsOnScreen: 'The results are on the shared screen.',
  },
  facilitator: {
    startWorkshop: (n: number) => `Start workshop (${plural(n, 'voter')})`,
    needVoter: 'At least one person must vote before the workshop can start.',
    introHint: 'The introduction is on the shared screen. Start the first category when the team is ready.',
    introScriptTitle: 'Introduction to read out',
    introScript: [
      "Thanks for joining this Squad Health Check. It's a quick, honest look at how we feel about our work. It's not an evaluation, and there are no wrong answers.",
      "For each category, vote on your phone with a colour (green: all good, orange: some problems, red: needs to change) and a trend (improving, stable or getting worse).",
      "Votes are anonymous. After each one, we'll discuss the results, especially where we disagree. Let's start!",
    ],
    startFirst: 'Start first category',
    facilitatorVotes: 'I take part in the vote',
    facilitatorVotesHint: 'Can only be changed before the workshop starts.',
    voted: 'voted',
    waiting: 'waiting',
    allNotes: 'Notes per category',
    loadingNotes: 'Loading notes…',
  },

  notes: {
    backToSession: 'Back to the session',
    privacy: 'Only you can see these notes. Keep this window out of your screen share.',
    downloadMarkdown: 'Download Markdown',
    downloadPdf: 'Download PDF',
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
    sessionCode: 'Session Code',
    participants: 'Participants',
    summary: 'Results Summary',
    category: 'Category',
    health: 'Health',
    trend: 'Trend',
    details: 'Detailed Results',
    votes: 'Votes',
    discussion: 'Discussion Notes',
    session: 'Session',
    pdfTrends: { up: 'Up', stable: 'Stable', down: 'Down' },
  },
};

export type Messages = typeof en;

const fr: Messages = {
  mandatory: ' - obligatoire',
  save: 'Enregistrer',
  cancel: 'Annuler',
  code: (code) => `Code : ${code}`,
  votes: (n) => plural(n, 'vote'),
  votesReceived: (n, total) => `${n} / ${total} votes reçus`,
  categoryOf: (i, n) => `Catégorie ${i} sur ${n}`,
  categoryPosition: (i, n) => `catégorie ${i} sur ${n}`,
  loadingResults: 'Chargement des résultats…',
  backToHome: "Retour à l'accueil",
  sessionNotFound: 'Session introuvable',
  connecting: 'Connexion à la session…',
  reconnecting: 'Reconnexion…',
  switchLang: 'Switch to English',

  colors: { green: 'Vert', orange: 'Orange', red: 'Rouge' },
  colorFallbacks: {
    green: 'Tout va bien : nous sommes satisfaits de la situation.',
    orange: "Quelques problèmes, mais rien d'alarmant.",
    red: 'Ça ne va pas : il faut y remédier.',
  },
  trends: { up: 'En amélioration', stable: 'Stable', down: 'En dégradation' },

  home: {
    welcome: 'Squad Health Check',
    intro:
      "Animez des bilans de santé anonymes avec votre équipe. Votez sur des catégories, discutez des résultats et suivez le bien-être de votre squad.",
    createTitle: 'Créer une session',
    createText: 'Configurez les catégories et invitez votre équipe',
    createButton: 'Créer la session',
    joinTitle: 'Rejoindre une session',
    sessionCode: 'Code de session',
    codePlaceholder: 'ex. ABC123',
    codeMissing: 'Saisissez le code de session partagé par votre facilitateur.',
    joinButton: 'Rejoindre la session',
    howItWorks: 'Comment ça marche',
    steps: [
      'Le facilitateur crée une session et partage le code / lien',
      "Les membres de l'équipe la rejoignent avec leur nom",
      'Pour chaque catégorie, chacun vote une couleur de santé (vert, orange, rouge) et une tendance (en amélioration, stable, en dégradation)',
      'Les votes sont anonymes — les résultats ne montrent que des totaux',
      "Une fois tous les votes reçus, l'équipe en discute",
      'Téléchargez un récapitulatif (Markdown + PDF) à la fin',
    ],
  },

  create: {
    title: 'Créer une session',
    intro: 'Personnalisez les catégories de votre bilan, puis lancez la session.',
    noCategories: 'Ajoutez au moins une catégorie avant de lancer la session.',
    start: (n) => `Lancer la session (${n} catégorie${n !== 1 ? 's' : ''})`,
  },

  editor: {
    name: 'Nom de la catégorie (anglais)',
    nameFr: 'Nom de la catégorie (français)',
    nameMissing: 'Saisissez un nom de catégorie.',
    lengthHint: 'Gardez chaque description sous 100 caractères pour une lecture rapide.',
    positive: '🟢 Description positive (vert) — anglais',
    mixed: '🟠 Description mitigée (orange) — anglais',
    negative: '🔴 Description négative (rouge) — anglais',
    positiveFr: '🟢 Description positive (vert) — français',
    mixedFr: '🟠 Description mitigée (orange) — français',
    negativeFr: '🔴 Description négative (rouge) — français',
    positiveMissing: 'Décrivez à quoi ressemble un état sain (vert).',
    mixedMissing: 'Décrivez à quoi ressemble un état mitigé (orange).',
    negativeMissing: 'Décrivez à quoi ressemble un état problématique (rouge).',
    addTitle: 'Nouvelle catégorie',
    add: 'Ajouter une catégorie',
    edit: (name) => `Modifier ${name}`,
    remove: (name) => `Supprimer ${name}`,
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
    categoriesToReview: (n) => `${n} catégorie${n !== 1 ? 's' : ''} à passer en revue`,
    waiting: 'En attente du lancement de la session par le facilitateur…',
  },

  voting: {
    sessionProgress: 'Progression de la session',
    healthColor: 'Couleur de santé',
    trend: 'Tendance',
    pickColor: 'Choisissez une couleur de santé.',
    pickTrend: 'Choisissez une tendance.',
    submit: 'Voter',
    update: 'Modifier le vote',
    cancelEdit: 'Annuler',
    edit: 'Modifier mon vote',
    submitted: 'Vote envoyé !',
    votesReceivedLabel: 'Votes reçus',
    revealNowCount: (n, total) => `Révéler les votes (${n}/${total})`,
  },

  results: {
    title: (n) => `Résultats (${plural(n, 'vote')})`,
    next: 'Catégorie suivante',
    finish: 'Terminer la session',
    noVotes: 'Aucun vote',
    mostly: 'Majoritairement',
  },

  finished: {
    title: 'Session terminée !',
    intro: 'Voici le récapitulatif de tous les résultats du bilan.',
    participantIntro: "Merci pour votre participation ! Le récapitulatif est sur l'écran partagé.",
  },

  presenter: {
    open: 'Fenêtre de présentation',
    hint: "Partagez la fenêtre de présentation avec l'équipe et gardez celle-ci pour vous.",
    allowPopups: "Autorisez les pop-ups pour ce site afin d'ouvrir la fenêtre de présentation.",
    documentTitle: (code) => `Présentation — ${code}`,
    onlyFacilitator: 'Seul le facilitateur peut ouvrir la vue de présentation',
    joinTitle: 'Rejoignez le Squad Health Check',
  },

  intro: {
    title: 'Squad Health Check',
    what: "Un rapide tour de l'état de la squad. Pour chaque catégorie, chacun choisit une couleur de santé et une tendance, puis nous discutons ensemble des résultats.",
    colorsTitle: 'Couleurs de santé',
    trendsTitle: 'Tendance',
    trendsHint: 'Par rapport à la situation récente.',
    categoryCount: (n) => [
      'Nous avons ',
      `${n}`,
      ` catégorie${n !== 1 ? 's' : ''} à aborder ensemble.`,
    ],
  },
  participant: {
    waitingOthers: 'En attente des autres…',
    resultsOnScreen: "Les résultats sont sur l'écran partagé.",
  },
  facilitator: {
    startWorkshop: (n) => `Lancer l'atelier (${n} votant${n !== 1 ? 's' : ''})`,
    needVoter: "Au moins une personne doit voter pour lancer l'atelier.",
    introHint: "L'introduction est sur l'écran partagé. Lancez la première catégorie quand l'équipe est prête.",
    introScriptTitle: "Introduction à lire",
    introScript: [
      "Merci de participer à ce Squad Health Check. C'est un regard rapide et honnête sur la façon dont nous vivons notre travail. Ce n'est pas une évaluation, et il n'y a pas de mauvaise réponse.",
      "Pour chaque catégorie, votez sur votre téléphone avec une couleur (vert : tout va bien, orange : quelques problèmes, rouge : il faut changer) et une tendance (en amélioration, stable ou en dégradation).",
      "Les votes sont anonymes. Après chacun, nous discuterons des résultats, surtout là où nous ne sommes pas d'accord. C'est parti !",
    ],
    startFirst: 'Lancer la première catégorie',
    facilitatorVotes: 'Je participe au vote',
    facilitatorVotesHint: "Modifiable uniquement avant le début de l'atelier.",
    voted: 'a voté',
    waiting: 'en attente',
    allNotes: 'Notes par catégorie',
    loadingNotes: 'Chargement des notes…',
  },

  notes: {
    backToSession: 'Retour à la session',
    privacy: "Vous seul voyez ces notes. Gardez cette fenêtre hors de votre partage d'écran.",
    downloadMarkdown: 'Télécharger le Markdown',
    downloadPdf: 'Télécharger le PDF',
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
    sessionCode: 'Code de session',
    participants: 'Participants',
    summary: 'Synthèse des résultats',
    category: 'Catégorie',
    health: 'Santé',
    trend: 'Tendance',
    details: 'Résultats détaillés',
    votes: 'Votes',
    discussion: 'Notes de discussion',
    session: 'Session',
    pdfTrends: { up: 'Hausse', stable: 'Stable', down: 'Baisse' },
  },
};

export const messagesFor = (lang: Lang): Messages => (lang === 'fr' ? fr : en);

/** Messages in the current language; a live binding swapped by switchLang */
export let t = messagesFor(LANG);
