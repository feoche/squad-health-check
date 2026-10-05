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
  },
  {
    name: 'Stress',
    positiveDescription:
      'Things feel relaxed and under control. Our workload is sustainable.',
    mixedDescription:
      'Pressure rises at times: some peaks and overtime, but still manageable.',
    negativeDescription:
      "We're super stressed. Constant pressure, overtime and no room to breathe.",
  },
  {
    name: 'Fun',
    positiveDescription:
      'We love coming to work and have great fun working together!',
    mixedDescription:
      'Work is OK. There are good moments, but it often feels like routine.',
    negativeDescription: 'Work is boring. We just get through the day.',
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
  },
  {
    name: 'Feedback (internal + external)',
    positiveDescription:
      'We give and receive positive and constructive feedback openly, and it helps us grow.',
    mixedDescription:
      'Feedback happens, but rarely, too late, or only from some people.',
    negativeDescription:
      "We don't know how to give or receive feedback in a healthy way, so we avoid it.",
  },
];
