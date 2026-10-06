import { Category } from '../types';

/** The default selection stays within this many categories, so the workshop fits its time box */
export const RECOMMENDED_MAX_CATEGORIES = 10;

/**
 * Default categories, picked from Spotify's original cards, the slide deck (file.md) and
 * psychological safety (Google's Project Aristotle). Each one is backed by team-effectiveness
 * research (Project Aristotle, DORA) and none overlaps another. Sorted from the least to the
 * most personal topic, so trust builds before the sensitive votes.
 * The facilitator can customise these before starting a session.
 */
export const defaultCategories: Category[] = [
  {
    name: 'Easy to Release',
    nameFr: 'Facile pour déployer',
    positiveDescription:
      'Releasing is simple, safe and automated. We ship whenever we want.',
    mixedDescription:
      'Releasing works, but takes manual steps and care. Some releases are stressful.',
    negativeDescription:
      'Releasing is risky and painful: manual work, rollbacks, and it takes forever.',
    positiveDescriptionFr:
      'Livrer est simple, sûr et automatisé. On met en prod quand on veut.',
    mixedDescriptionFr:
      'Livrer fonctionne, mais demande des étapes manuelles. Certaines mises en prod stressent.',
    negativeDescriptionFr:
      "Livrer est risqué et pénible : du manuel, des rollbacks, et ça n'en finit pas.",
  },
  {
    name: 'Health of Codebase',
    nameFr: 'Santé du code',
    positiveDescription:
      "Our code is clean, readable and well tested. We're proud of it.",
    mixedDescription:
      'The code is OK, but some parts are messy or untested, and tech debt is growing.',
    negativeDescription:
      'The code is a mess: tech debt is out of control and every change breaks something.',
    positiveDescriptionFr:
      'Notre code est propre, lisible et bien testé. Nous en sommes fiers.',
    mixedDescriptionFr:
      'Le code est correct, mais certaines parties sont confuses ou non testées, et la dette grandit.',
    negativeDescriptionFr:
      'Le code est un chantier : la dette déborde et chaque changement casse quelque chose.',
  },
  {
    name: 'Delivering Value',
    nameFr: 'Délivrer de la valeur',
    positiveDescription:
      "We deliver things we're proud of, and our stakeholders are really happy.",
    mixedDescription:
      'We deliver, but not always what matters most. Stakeholders are partly satisfied.',
    negativeDescription:
      "We deliver little value and aren't proud of it. Stakeholders are unhappy.",
    positiveDescriptionFr:
      'Nous livrons des choses dont nous sommes fiers, et nos parties prenantes sont ravies.',
    mixedDescriptionFr:
      "Nous livrons, mais pas toujours l'essentiel. Nos parties prenantes sont mitigées.",
    negativeDescriptionFr:
      "Nous livrons peu de valeur et n'en sommes pas fiers. Nos parties prenantes sont déçues.",
  },
  {
    name: 'Mission',
    nameFr: 'Mission',
    positiveDescription:
      'We know exactly why we are here, and we are really excited about it.',
    mixedDescription:
      'We roughly know our goals, but the bigger picture or priorities are fuzzy.',
    negativeDescription:
      'We have no idea why we are here. There is no big picture and no focus.',
    positiveDescriptionFr:
      'Nous savons exactement pourquoi nous sommes là, et ça nous motive vraiment.',
    mixedDescriptionFr:
      'Nous connaissons à peu près nos objectifs, mais la vision ou les priorités sont floues.',
    negativeDescriptionFr:
      "Nous ne savons pas pourquoi nous sommes là. Pas de vision d'ensemble, pas de cap.",
  },
  {
    name: 'Suitable Process',
    nameFr: 'Processus',
    positiveDescription:
      'Our way of working fits us well. Rituals are useful and we keep improving them.',
    mixedDescription:
      'Our process mostly works, but some rituals or rules feel useless or slow us down.',
    negativeDescription:
      'Our way of working gets in the way. We follow rules that make no sense to us.',
    positiveDescriptionFr:
      'Notre façon de travailler nous convient. Les rituels sont utiles et on les améliore.',
    mixedDescriptionFr:
      'Le processus fonctionne, mais certains rituels ou règles semblent inutiles ou nous freinent.',
    negativeDescriptionFr:
      "Notre façon de travailler nous gêne. On suit des règles qui n'ont aucun sens pour nous.",
  },
  {
    name: 'Pawns or Players',
    nameFr: 'Pions ou acteurs',
    positiveDescription:
      'We are in control of our destiny. We decide what to build and how to build it.',
    mixedDescription:
      'We have a say on how we build things, but little on what we build.',
    negativeDescription:
      'We are pawns in a chess game, with no influence over what or how we build.',
    positiveDescriptionFr:
      'Nous maîtrisons notre destin. Nous décidons quoi construire et comment.',
    mixedDescriptionFr:
      'Nous avons notre mot à dire sur le comment, mais peu sur le quoi.',
    negativeDescriptionFr:
      'Nous sommes des pions, sans influence sur ce que nous construisons ni comment.',
  },
  {
    name: 'Learning',
    nameFr: 'Apprentissage',
    positiveDescription:
      'We keep learning interesting things and have dedicated time for it.',
    mixedDescription:
      'We learn sometimes, mostly on the job. Learning time is often the first to go.',
    negativeDescription:
      'We never have time to learn. Our skills are stagnating.',
    positiveDescriptionFr:
      'Nous apprenons sans cesse des choses intéressantes, avec du temps dédié pour ça.',
    mixedDescriptionFr:
      "Nous apprenons parfois, surtout sur le tas. Le temps d'apprentissage saute souvent.",
    negativeDescriptionFr:
      "Nous n'avons jamais le temps d'apprendre. Nos compétences stagnent.",
  },
  {
    name: 'Teamwork',
    nameFr: "Esprit d'équipe",
    positiveDescription:
      "We're a close-knit team: we help each other and share the work naturally.",
    mixedDescription:
      'We collaborate on some topics, but often work in silos or rely on a few people.',
    negativeDescription:
      "We're a group of individuals who neither know nor care what the others do.",
    positiveDescriptionFr:
      "Nous sommes une équipe soudée : on s'entraide et on partage le travail naturellement.",
    mixedDescriptionFr:
      'On collabore parfois, mais souvent en silos ou en dépendant de quelques personnes.',
    negativeDescriptionFr:
      "Nous sommes des individus qui ignorent ce que font les autres, et s'en moquent.",
  },
  {
    name: 'Psychological Safety',
    nameFr: 'Sécurité psychologique',
    positiveDescription:
      'We can speak up, ask questions and admit mistakes without fear.',
    mixedDescription:
      'We speak up on most things, but some topics or people make us hold back.',
    negativeDescription:
      'We keep quiet: raising a problem or admitting a mistake feels risky.',
    positiveDescriptionFr:
      'Nous pouvons parler, poser des questions et reconnaître nos erreurs sans crainte.',
    mixedDescriptionFr:
      "On s'exprime sur la plupart des sujets, mais certains sujets ou personnes nous retiennent.",
    negativeDescriptionFr:
      'Nous nous taisons : soulever un problème ou avouer une erreur semble risqué.',
  },
  {
    name: 'Fun',
    nameFr: 'Plaisir',
    positiveDescription:
      'We love coming to work and have great fun together.',
    mixedDescription:
      'Work is OK. There are good moments, but it often feels routine.',
    negativeDescription:
      'Work is boring. We just get through the day.',
    positiveDescriptionFr:
      'Nous adorons venir travailler et nous nous amusons beaucoup ensemble.',
    mixedDescriptionFr:
      "Le travail est correct. Il y a de bons moments, mais c'est souvent la routine.",
    negativeDescriptionFr:
      'Le travail est ennuyeux. On attend juste que la journée passe.',
  },
];

/**
 * The other built-in cards, suggested to the facilitator but not selected by default:
 * each one largely overlaps a default category.
 */
export const extraCategories: Category[] = [
  {
    name: 'Speed',
    nameFr: 'Vitesse',
    positiveDescription:
      'We get things done quickly. No waiting, no delays.',
    mixedDescription:
      'We move forward, but often wait on others or get interrupted.',
    negativeDescription:
      'We never seem to finish anything. We keep getting stuck or interrupted.',
    positiveDescriptionFr:
      "Nous avançons vite. Pas d'attente, pas de retard.",
    mixedDescriptionFr:
      'Nous avançons, mais attendons souvent les autres ou sommes interrompus.',
    negativeDescriptionFr:
      'Nous ne finissons jamais rien. Nous sommes sans cesse bloqués ou interrompus.',
  },
  {
    name: 'Support',
    nameFr: 'Soutien',
    positiveDescription:
      'We always get great support and help from other teams when we ask for it.',
    mixedDescription:
      'We get help eventually, but it is often slow or depends on who we ask.',
    negativeDescription:
      "We keep getting stuck because we can't get the help we ask for.",
    positiveDescriptionFr:
      "Nous obtenons toujours de l'aide et du soutien des autres équipes quand on en demande.",
    mixedDescriptionFr:
      "On finit par obtenir de l'aide, mais c'est souvent lent ou ça dépend de qui on sollicite.",
    negativeDescriptionFr:
      "Nous restons bloqués car nous n'obtenons pas l'aide que nous demandons.",
  },
  {
    name: 'Stress',
    nameFr: 'Stress',
    positiveDescription:
      'Things feel calm and under control. Our workload is sustainable.',
    mixedDescription:
      'Pressure builds at times, with peaks and overtime, but it stays manageable.',
    negativeDescription:
      "We're very stressed: constant pressure, overtime and no room to breathe.",
    positiveDescriptionFr:
      "L'ambiance est sereine et sous contrôle. Notre charge de travail est soutenable.",
    mixedDescriptionFr:
      'La pression monte parfois, avec des pics et des heures sup, mais ça reste gérable.',
    negativeDescriptionFr:
      'Nous sommes très stressés : pression constante, heures sup et aucun répit.',
  },
  {
    name: 'Feedback (internal + external)',
    nameFr: 'Feedback (interne + externe)',
    positiveDescription:
      'We give and seek feedback, within the team and from users, and it helps us grow.',
    mixedDescription:
      'Feedback happens, but rarely, too late or only from some people.',
    negativeDescription:
      "We don't know how to give or receive feedback well, so we avoid it.",
    positiveDescriptionFr:
      "Nous donnons et sollicitons du feedback, dans l'équipe et auprès des utilisateurs.",
    mixedDescriptionFr:
      'Le feedback existe, mais rarement, trop tard ou seulement de la part de certains.',
    negativeDescriptionFr:
      "Nous ne savons pas bien donner ni recevoir du feedback, alors nous l'évitons.",
  },
  {
    name: 'Proactive',
    nameFr: 'Proactif',
    positiveDescription:
      'We stay ahead of user and stakeholder needs, and prevent problems before they happen.',
    mixedDescription:
      'We sometimes anticipate, but often react only once problems show up.',
    negativeDescription:
      "We're always firefighting, only reacting to what has already happened.",
    positiveDescriptionFr:
      'Nous anticipons les besoins des utilisateurs et prévenons les problèmes en amont.',
    mixedDescriptionFr:
      'Nous anticipons parfois, mais réagissons souvent une fois le problème apparu.',
    negativeDescriptionFr:
      'Nous éteignons des incendies en permanence, en ne faisant que réagir.',
  },
];

/** Every built-in category: the defaults, then the extra suggestions */
export const builtInCategories: Category[] = [...defaultCategories, ...extraCategories];
