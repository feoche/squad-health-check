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
      'Releasing is simple, safe and mostly automated. We ship whenever we want.',
    mixedDescription:
      'Releasing works but needs manual steps and care. Some releases cause stress or rework.',
    negativeDescription:
      'Releasing is risky and painful: lots of manual work, frequent rollbacks, takes forever.',
    positiveDescriptionFr:
      'Déployer est simple, sûr et presque entièrement automatisé. On livre quand on veut.',
    mixedDescriptionFr:
      'Déployer fonctionne mais demande des étapes manuelles. Certaines mises en prod stressent.',
    negativeDescriptionFr:
      "Déployer est risqué et pénible : beaucoup de manuel, des rollbacks, ça n'en finit pas.",
  },
  {
    name: 'Health of Codebase',
    nameFr: 'Santé du code',
    positiveDescription:
      "Our code is clean, easy to read and well tested. We're proud of it.",
    mixedDescription:
      'Code is OK overall, but some areas are messy or untested and tech debt is growing.',
    negativeDescription:
      'Our code is a mess. Tech debt is out of control and every change breaks something.',
    positiveDescriptionFr:
      'Notre code est propre, lisible et bien testé. Nous en sommes fiers.',
    mixedDescriptionFr:
      'Le code est correct, mais certaines zones sont confuses ou non testées, la dette grandit.',
    negativeDescriptionFr:
      'Notre code est un chantier : la dette déborde et chaque changement casse quelque chose.',
  },
  {
    name: 'Delivering Value',
    nameFr: 'Délivrer de la valeur',
    positiveDescription:
      "We deliver great stuff we're proud of, and our stakeholders are really happy.",
    mixedDescription:
      'We deliver, but not always what matters most. Stakeholders are only partly satisfied.',
    negativeDescription:
      "We deliver low-value work we're not proud of. Our stakeholders are unhappy.",
    positiveDescriptionFr:
      'Nous livrons des choses dont nous sommes fiers, et nos parties prenantes sont ravies.',
    mixedDescriptionFr:
      'Nous livrons, mais pas toujours ce qui compte le plus. Les parties prenantes sont mitigées.',
    negativeDescriptionFr:
      "Nous livrons peu de valeur et n'en sommes pas fiers. Nos parties prenantes sont mécontentes.",
  },
  {
    name: 'Suitable Process',
    nameFr: 'Processus',
    positiveDescription:
      'Our way of working fits us perfectly. Rituals are useful and we keep improving them.',
    mixedDescription:
      'Our process mostly works, but some rituals or rules feel useless or slow us down.',
    negativeDescription:
      'Our way of working gets in the way. We follow rules that make no sense to us.',
    positiveDescriptionFr:
      'Notre façon de travailler nous va parfaitement. Les rituels sont utiles et on les améliore.',
    mixedDescriptionFr:
      'Le processus marche, mais certains rituels ou règles semblent inutiles ou nous freinent.',
    negativeDescriptionFr:
      "Notre façon de travailler nous gêne. Nous suivons des règles qui n'ont aucun sens pour nous.",
  },
  {
    name: 'Learning',
    nameFr: 'Apprentissage',
    positiveDescription:
      'We learn interesting things all the time and have time set aside for it.',
    mixedDescription:
      'We learn sometimes, but mostly on the job. Learning time is often sacrificed.',
    negativeDescription:
      'We never have time to learn anything. Our skills are stagnating.',
    positiveDescriptionFr:
      'Nous apprenons sans cesse des choses intéressantes et avons du temps dédié pour ça.',
    mixedDescriptionFr:
      "Nous apprenons parfois, surtout sur le tas. Le temps d'apprentissage est souvent sacrifié.",
    negativeDescriptionFr:
      "Nous n'avons jamais le temps d'apprendre. Nos compétences stagnent.",
  },
  {
    name: 'Teamwork',
    nameFr: "Esprit d'équipe",
    positiveDescription:
      "We're a gelled team: we help each other and share the work naturally.",
    mixedDescription:
      'We collaborate on some topics, but often work in silos or depend on a few people.',
    negativeDescription:
      "We're a bunch of individuals who don't know or care what the others are doing.",
    positiveDescriptionFr:
      "Nous sommes une équipe soudée : on s'entraide et on partage le travail naturellement.",
    mixedDescriptionFr:
      'On collabore parfois, mais souvent en silos ou en dépendant de quelques personnes.',
    negativeDescriptionFr:
      'Nous sommes des individus qui ignorent ce que font les autres, et ça ne nous intéresse pas.',
  },
  {
    name: 'Stress',
    nameFr: 'Stress',
    positiveDescription:
      'Things feel relaxed and under control. Our workload is sustainable.',
    mixedDescription:
      'Pressure rises at times: some peaks and overtime, but still manageable.',
    negativeDescription:
      "We're super stressed. Constant pressure, overtime and no room to breathe.",
    positiveDescriptionFr:
      "L'ambiance est détendue et sous contrôle. Notre charge de travail est soutenable.",
    mixedDescriptionFr:
      'La pression monte parfois : quelques pics et heures sup, mais ça reste gérable.',
    negativeDescriptionFr:
      'Nous sommes très stressés : pression constante, heures sup et aucun répit.',
  },
  {
    name: 'Fun',
    nameFr: 'Plaisir',
    positiveDescription:
      'We love coming to work and have great fun working together!',
    mixedDescription:
      'Work is OK. There are good moments, but it often feels like routine.',
    negativeDescription: 'Work is boring. We just get through the day.',
    positiveDescriptionFr:
      'Nous adorons venir travailler et nous nous amusons beaucoup ensemble !',
    mixedDescriptionFr:
      "Le travail est correct. Il y a de bons moments, mais c'est souvent la routine.",
    negativeDescriptionFr:
      'Le travail est ennuyeux. On attend juste que la journée passe.',
  },
  {
    name: 'Proactive',
    nameFr: 'Proactif',
    positiveDescription:
      'We anticipate customer and stakeholder needs and prevent problems before they happen.',
    mixedDescription:
      'We sometimes anticipate, but often react to issues only once they show up.',
    negativeDescription:
      "We're always firefighting. All we do is respond to things that already happened.",
    positiveDescriptionFr:
      'Nous anticipons les besoins des clients et parties prenantes et prévenons les problèmes.',
    mixedDescriptionFr:
      "Nous anticipons parfois, mais réagissons souvent aux problèmes une fois qu'ils surviennent.",
    negativeDescriptionFr:
      'Nous éteignons des incendies en permanence. Nous ne faisons que réagir à ce qui est arrivé.',
  },
  {
    name: 'Feedback (internal + external)',
    nameFr: 'Feedback (interne + externe)',
    positiveDescription:
      'We give and receive positive and constructive feedback openly, and it helps us grow.',
    mixedDescription:
      'Feedback happens, but rarely, too late, or only from some people.',
    negativeDescription:
      "We don't know how to give or receive feedback in a healthy way, so we avoid it.",
    positiveDescriptionFr:
      'On donne et reçoit du feedback positif et constructif ouvertement, et ça nous fait grandir.',
    mixedDescriptionFr:
      'Le feedback existe, mais rarement, trop tard ou seulement de la part de certains.',
    negativeDescriptionFr:
      "Nous ne savons pas donner ou recevoir du feedback sainement, alors nous l'évitons.",
  },
];
