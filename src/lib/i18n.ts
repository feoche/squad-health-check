/* ─── UI language: French for FR locales, English otherwise ─── */

export type Lang = 'en' | 'fr';

export const detectLang = (locale: string): Lang =>
  locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';

export const LANG: Lang = detectLang(
  typeof navigator !== 'undefined' ? navigator.language : 'en',
);

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

const en = {
  mandatory: ' - mandatory',
  save: 'Save',
  cancel: 'Cancel',
  code: (code: string) => `Code: ${code}`,
  votes: (n: number) => plural(n, 'vote'),
  votesReceived: (n: number, total: number) => `${n} / ${total} votes received`,
  categoryOf: (i: number, n: number) => `Category ${i} of ${n}`,
  loadingResults: 'Loading results…',
  backToHome: 'Back to home',
  sessionNotFound: 'Session not found',
  connecting: 'Connecting to session…',
  reconnecting: 'Reconnecting…',
  unknownState: 'Unknown session state',

  colors: { green: 'Green', orange: 'Orange', red: 'Red' },
  colorFallbacks: { green: 'Happy with it', orange: 'Issues to handle', red: 'Needs improvement' },
  trends: { up: 'Improving', stable: 'Stable', down: 'Getting worse' },

  home: {
    welcome: 'Welcome to Squad Health Check',
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
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
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
    title: 'Session Lobby',
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
    startVoting: (n: number) => `Start Voting (${plural(n, 'participant')})`,
    waiting: 'Waiting for the facilitator to start the session…',
  },

  voting: {
    sessionProgress: 'Session progress',
    healthColor: 'Health Color',
    trend: 'Trend',
    pickColor: 'Pick a health color.',
    pickTrend: 'Pick a trend.',
    submit: 'Submit Vote',
    submitted: 'Vote submitted!',
    votesReceivedLabel: 'Votes received',
    revealNow: 'Reveal Votes Now',
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
    notesHint: 'Notes and downloads are in your facilitator notes.',
  },

  notes: {
    button: 'Facilitator notes',
    allowPopups: 'Allow pop-ups for this site to open the facilitator notes.',
    documentTitle: (code: string) => `Facilitator notes — ${code}`,
    onlyFacilitator: 'Only the facilitator can open notes',
    backToSession: 'Back to the session',
    phases: { lobby: 'Lobby', voting: 'Voting', revealed: 'Revealed', finished: 'Finished' },
    privacy: 'Only you can see these notes. Keep this window out of your screen share.',
    summary: 'Summary',
    notStarted: "Voting hasn't started yet.",
    appearLater: 'Categories appear here once you move past them.',
    downloadMarkdown: 'Download Markdown',
    downloadPdf: 'Download PDF',
    discussion: 'Discussion notes',
    placeholder: 'Write down key discussion points…',
  },

  errors: {
    notAllowed: 'Not allowed — the session may have changed. Try reloading.',
    generic: 'Something went wrong. Check your connection and try again.',
    createFailed: 'Could not create a session. Please try again.',
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
  loadingResults: 'Chargement des résultats…',
  backToHome: "Retour à l'accueil",
  sessionNotFound: 'Session introuvable',
  connecting: 'Connexion à la session…',
  reconnecting: 'Reconnexion…',
  unknownState: 'État de session inconnu',

  colors: { green: 'Vert', orange: 'Orange', red: 'Rouge' },
  colorFallbacks: { green: 'Satisfaits', orange: 'Problèmes à traiter', red: 'À améliorer' },
  trends: { up: 'En amélioration', stable: 'Stable', down: 'En dégradation' },

  home: {
    welcome: 'Bienvenue sur Squad Health Check',
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
    moveUp: (name) => `Monter ${name}`,
    moveDown: (name) => `Descendre ${name}`,
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
    title: "Salle d'attente",
    sessionCode: 'Code de session',
    qrTitle: 'Scannez pour rejoindre la session',
    scanToJoin: 'Scannez pour rejoindre',
    shareLink: 'Lien de partage',
    copyLink: 'Copier le lien',
    linkCopied: 'Lien copié',
    participants: (n) => `Participants (${n})`,
    you: ' (vous)',
    categoriesToReview: (n) => `${n} catégorie${n !== 1 ? 's' : ''} à passer en revue`,
    startVoting: (n) => `Lancer le vote (${plural(n, 'participant')})`,
    waiting: 'En attente du lancement de la session par le facilitateur…',
  },

  voting: {
    sessionProgress: 'Progression de la session',
    healthColor: 'Couleur de santé',
    trend: 'Tendance',
    pickColor: 'Choisissez une couleur de santé.',
    pickTrend: 'Choisissez une tendance.',
    submit: 'Voter',
    submitted: 'Vote envoyé !',
    votesReceivedLabel: 'Votes reçus',
    revealNow: 'Révéler les votes',
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
    notesHint: 'Les notes et téléchargements sont dans vos notes de facilitateur.',
  },

  notes: {
    button: 'Notes du facilitateur',
    allowPopups: "Autorisez les pop-ups pour ce site afin d'ouvrir les notes du facilitateur.",
    documentTitle: (code) => `Notes du facilitateur — ${code}`,
    onlyFacilitator: 'Seul le facilitateur peut ouvrir les notes',
    backToSession: 'Retour à la session',
    phases: { lobby: "Salle d'attente", voting: 'Vote en cours', revealed: 'Révélé', finished: 'Terminé' },
    privacy: "Vous seul voyez ces notes. Gardez cette fenêtre hors de votre partage d'écran.",
    summary: 'Récapitulatif',
    notStarted: "Le vote n'a pas encore commencé.",
    appearLater: 'Les catégories apparaissent ici une fois passées.',
    downloadMarkdown: 'Télécharger le Markdown',
    downloadPdf: 'Télécharger le PDF',
    discussion: 'Notes de discussion',
    placeholder: 'Notez les points clés de la discussion…',
  },

  errors: {
    notAllowed: 'Action refusée — la session a peut-être changé. Rechargez la page.',
    generic: 'Une erreur est survenue. Vérifiez votre connexion et réessayez.',
    createFailed: 'Impossible de créer la session. Veuillez réessayer.',
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

/** Messages in the user's language */
export const t = messagesFor(LANG);
