import { Category } from '../types';
import { psychologicalSafety } from './spotifyCategories';

/**
 * Our own set, replacing Spotify's cards that bundle two ideas in one sentence: each category
 * asks about a single thing, so a color means the same to everyone. Sorted from the least to
 * the most personal topic, so trust builds before the sensitive votes.
 */
export const ourCategories: Category[] = [
  {
    name: 'Release Confidence',
    nameFr: 'Confiance au déploiement',
    positiveDescription:
      'Releasing is routine: we ship when we want, without fear.',
    negativeDescription:
      'Every release is a gamble: we fear breaking production.',
    positiveDescriptionFr:
      'Livrer est une routine : on met en production quand on veut, sans crainte.',
    negativeDescriptionFr:
      'Chaque livraison est un pari : nous craignons de casser la production.',
  },
  {
    name: 'Code Quality',
    nameFr: 'Qualité du code',
    positiveDescription:
      'Our code is clean, readable and tested: changing it is easy and safe.',
    negativeDescription:
      'Our code is hard to read and fragile: every change risks breaking something.',
    positiveDescriptionFr:
      'Notre code est propre, lisible et testé : le modifier est simple et sûr.',
    negativeDescriptionFr:
      'Notre code est difficile à lire et fragile : chaque changement risque de tout casser.',
  },
  {
    name: 'Clear Mission',
    nameFr: 'Mission claire',
    positiveDescription:
      'We know why our team exists and what success looks like.',
    negativeDescription:
      "We don't know why our team exists or where we are heading.",
    positiveDescriptionFr:
      'Nous savons pourquoi notre équipe existe et à quoi ressemble la réussite.',
    negativeDescriptionFr:
      'Nous ne savons pas pourquoi notre équipe existe ni où nous allons.',
  },
  {
    name: 'Customer Value',
    nameFr: 'Valeur pour les utilisateurs',
    positiveDescription:
      'What we deliver is used and valued by our users.',
    negativeDescription:
      'What we deliver is rarely used or valued by our users.',
    positiveDescriptionFr:
      'Ce que nous livrons est utilisé et apprécié de nos utilisateurs.',
    negativeDescriptionFr:
      'Ce que nous livrons est peu utilisé et peu apprécié de nos utilisateurs.',
  },
  {
    name: 'Autonomy',
    nameFr: 'Autonomie',
    positiveDescription:
      'We decide how to do our work without waiting for approval.',
    negativeDescription:
      'We need approval for most decisions, even small ones.',
    positiveDescriptionFr:
      'Nous décidons comment faire notre travail sans attendre de validation.',
    negativeDescriptionFr:
      'Il nous faut une validation pour la plupart des décisions, même petites.',
  },
  {
    name: 'Focus',
    nameFr: 'Concentration',
    positiveDescription:
      'We can work on one thing at a time, with few interruptions.',
    negativeDescription:
      'We are constantly interrupted and switch tasks all day.',
    positiveDescriptionFr:
      "Nous travaillons sur une chose à la fois, avec peu d'interruptions.",
    negativeDescriptionFr:
      'Nous sommes sans cesse interrompus et changeons de tâche toute la journée.',
  },
  {
    name: 'Sustainable Workload',
    nameFr: 'Charge soutenable',
    positiveDescription:
      'Our workload is manageable and we can keep this pace for a long time.',
    negativeDescription:
      "We are overloaded and can't keep this pace for long.",
    positiveDescriptionFr:
      'Notre charge est gérable et nous pouvons tenir ce rythme longtemps.',
    negativeDescriptionFr:
      'Nous sommes surchargés et ne pouvons pas tenir ce rythme longtemps.',
  },
  {
    name: 'Collaboration',
    nameFr: 'Collaboration',
    positiveDescription:
      'We work together and help each other without being asked.',
    negativeDescription:
      'We work alone, in parallel, and rarely help each other.',
    positiveDescriptionFr:
      "Nous travaillons ensemble et nous entraidons sans qu'on le demande.",
    negativeDescriptionFr:
      'Nous travaillons chacun de notre côté et nous entraidons rarement.',
  },
  psychologicalSafety,
  {
    name: 'Skill Growth',
    nameFr: 'Montée en compétences',
    positiveDescription:
      'We regularly learn new things and grow our skills.',
    negativeDescription:
      'We learn little and our skills stagnate.',
    positiveDescriptionFr:
      'Nous apprenons régulièrement et développons nos compétences.',
    negativeDescriptionFr:
      'Nous apprenons peu et nos compétences stagnent.',
  },
];

/** The other categories of the set, suggested to the facilitator but not selected by default */
export const ourExtraCategories: Category[] = [
  {
    name: 'Operational Stability',
    nameFr: 'Stabilité en production',
    positiveDescription:
      'Production runs smoothly: incidents are rare.',
    negativeDescription:
      'Production is fragile: incidents are frequent.',
    positiveDescriptionFr:
      'La production tourne bien : les incidents sont rares.',
    negativeDescriptionFr:
      'La production est fragile : les incidents sont fréquents.',
  },
  {
    name: 'Clear Priorities',
    nameFr: 'Priorités claires',
    positiveDescription:
      'We always know what matters most right now.',
    negativeDescription:
      "We don't know what matters most right now.",
    positiveDescriptionFr:
      'Nous savons toujours ce qui compte le plus en ce moment.',
    negativeDescriptionFr:
      'Nous ne savons pas ce qui compte le plus en ce moment.',
  },
  {
    name: 'Way of Working',
    nameFr: 'Façon de travailler',
    positiveDescription:
      'Our way of working fits us and helps us get things done.',
    negativeDescription:
      'Our way of working gets in our way more than it helps.',
    positiveDescriptionFr:
      'Notre façon de travailler nous convient et nous aide à avancer.',
    negativeDescriptionFr:
      "Notre façon de travailler nous gêne plus qu'elle ne nous aide.",
  },
  {
    name: 'Help from Other Teams',
    nameFr: 'Aide des autres équipes',
    positiveDescription:
      'When we ask other teams for help, we get it.',
    negativeDescription:
      'When we ask other teams for help, we stay stuck.',
    positiveDescriptionFr:
      "Quand nous demandons de l'aide à d'autres équipes, nous l'obtenons.",
    negativeDescriptionFr:
      "Quand nous demandons de l'aide à d'autres équipes, nous restons bloqués.",
  },
  {
    name: 'Enjoyment at Work',
    nameFr: 'Plaisir au travail',
    positiveDescription:
      'We enjoy our work and look forward to it.',
    negativeDescription:
      'Work feels like a chore.',
    positiveDescriptionFr:
      'Nous aimons notre travail et nous réjouissons de le faire.',
    negativeDescriptionFr:
      'Le travail est une corvée.',
  },
];
