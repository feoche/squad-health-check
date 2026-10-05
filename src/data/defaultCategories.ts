import { Category } from '../types';

/**
 * Default categories extracted from the Squad Health Check slide deck (file.md).
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
  {
    name: 'Proactive',
    nameFr: 'Proactif',
    positiveDescription:
      'We anticipate needs and prevent problems before they happen.',
    mixedDescription:
      'We sometimes anticipate, but often react only once problems show up.',
    negativeDescription:
      "We're always firefighting, only reacting to what has already happened.",
    positiveDescriptionFr:
      "Nous anticipons les besoins et prévenons les problèmes avant qu'ils n'arrivent.",
    mixedDescriptionFr:
      'Nous anticipons parfois, mais réagissons souvent une fois le problème apparu.',
    negativeDescriptionFr:
      'Nous éteignons des incendies en permanence, en ne faisant que réagir.',
  },
  {
    name: 'Feedback (internal + external)',
    nameFr: 'Feedback (interne + externe)',
    positiveDescription:
      'We give and receive feedback openly, and it helps us grow.',
    mixedDescription:
      'Feedback happens, but rarely, too late or only from some people.',
    negativeDescription:
      "We don't know how to give or receive feedback well, so we avoid it.",
    positiveDescriptionFr:
      'Nous donnons et recevons du feedback ouvertement, et ça nous fait grandir.',
    mixedDescriptionFr:
      'Le feedback existe, mais rarement, trop tard ou seulement de la part de certains.',
    negativeDescriptionFr:
      "Nous ne savons pas bien donner ni recevoir du feedback, alors nous l'évitons.",
  },
];
