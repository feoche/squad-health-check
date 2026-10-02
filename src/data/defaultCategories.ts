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
      'Releasing is simple, safe, painless and mostly automated.',
    negativeDescription:
      'Releasing is risky, painful, lots of manual work and takes forever.',
  },
  {
    name: 'Health of Codebase',
    nameFr: 'Santé du code',
    positiveDescription:
      "We're proud of the quality of our code! It is clean, easy to read and has great test coverage.",
    negativeDescription:
      'Our code is a pile of dung and technical debt is raging out of control.',
  },
  {
    name: 'Delivering Value',
    nameFr: 'Délivrer de la valeur',
    positiveDescription:
      "We deliver great stuff! We're proud of it and our stakeholders are really happy.",
    negativeDescription:
      'We deliver crap. We feel ashamed to deliver it. Our stakeholders hate us.',
  },
  {
    name: 'Suitable Process',
    nameFr: 'Processus',
    positiveDescription: 'Our way of working fits us perfectly!',
    negativeDescription: 'Our way of working sucks!',
  },
  {
    name: 'Learning',
    nameFr: 'Apprentissage',
    positiveDescription:
      "We're learning lots of interesting stuff all the time!",
    negativeDescription: 'We never have time to learn anything.',
  },
  {
    name: 'Teamwork',
    nameFr: "Esprit d'équipe",
    positiveDescription:
      'We are a totally gelled super-team with awesome collaboration!',
    negativeDescription:
      'We are a bunch of individuals that neither know nor care about what the other people in the squad are doing.',
  },
  {
    name: 'Stress',
    positiveDescription:
      "Things are pretty relaxed and feel under control. I don't feel stressed.",
    negativeDescription: 'Feeling super stressed!',
  },
  {
    name: 'Fun',
    positiveDescription:
      'We love going to work and have great fun working together!',
    negativeDescription: 'Boooooooring...',
  },
  {
    name: 'Proactive',
    nameFr: 'Proactif',
    positiveDescription:
      'We are on top of our customers and stakeholders needs and prevent problems from happening.',
    negativeDescription:
      'We are losing it. All we can do is respond to things that have already happened. Constant firefighting.',
  },
  {
    name: 'Feedback (internal + external)',
    positiveDescription:
      "We support each other's growth efforts with both positive and constructive feedback.",
    negativeDescription:
      "We don't know how to give or receive feedback in a healthy way.",
  },
];

