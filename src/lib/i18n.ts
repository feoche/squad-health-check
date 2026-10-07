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
    byPerson: 'Votes',
    matrixCaption: 'Votes by health colour and trend',
    descriptions: 'Health descriptions',
    unknownVoter: 'Former participant',
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
    disconnectedHint: (names: string) => `Disconnected: ${names}. Reveal the votes once the others have voted.`,
    allNotes: 'Notes per category',
    loadingNotes: 'Loading notes…',
    offlineHint: 'Use + and − to count the votes of people in the room who are not connected.',
    offlineCount: (n: number) => `Including ${plural(n, 'vote')} you added.`,
    addOfflineVote: (color: string, trend: string) => `Add a vote: ${color}, ${trend}`,
    removeOfflineVote: (color: string, trend: string) => `Remove a vote you added: ${color}, ${trend}`,
    offlineInCell: (n: number) => `${plural(n, 'vote')} added manually`,
    resetOffline: 'Reset manual votes',
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
    byPerson: 'Votes',
    matrixCaption: 'Votes par couleur de santé et tendance',
    descriptions: 'Description des couleurs',
    unknownVoter: 'Ancien participant',
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
    disconnectedHint: (names) => `Hors ligne : ${names}. Révélez les votes une fois que les autres ont voté.`,
    allNotes: 'Notes par catégorie',
    loadingNotes: 'Chargement des notes…',
    offlineHint: 'Utilisez + et − pour compter les votes des personnes présentes mais non connectées.',
    offlineCount: (n) => `Dont ${pluralFr(n, 'vote')} ajouté${n > 1 ? 's' : ''} par vous.`,
    addOfflineVote: (color, trend) => `Ajouter un vote : ${color}, ${trend}`,
    removeOfflineVote: (color, trend) => `Retirer un vote ajouté : ${color}, ${trend}`,
    offlineInCell: (n) => `${pluralFr(n, 'vote')} ajouté${n > 1 ? 's' : ''} manuellement`,
    resetOffline: 'Réinitialiser les votes manuels',
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
  },
};

export const messagesFor = (lang: Lang): Messages => (lang === 'fr' ? fr : en);

/** Messages in the current language; a live binding swapped by switchLang */
export let t = messagesFor(LANG);
