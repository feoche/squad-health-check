import {
  Card,
  CARD_COLOR,
  Icon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Anonymity, Category, VoteMode } from '../types';
import VoteLegend from './VoteLegend';
import { TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';

interface Props {
  categories: Category[];
  /** Told before the first vote, so everyone knows who will see it */
  anonymity: Anonymity;
  /** Which scale the votes use: the health colours or the 1 to 9 score */
  voteMode: VoteMode;
  /** Phone legend: category count, colours and trends only */
  compact?: boolean;
}

/** Built-in presentation of the workshop, shown before the first category. */
function IntroContent({ categories, anonymity, voteMode, compact = false }: Props) {
  const [before, count, after] = t.intro.categoryCount(categories.length);

  return (
    <div className={compact ? 'stack intro-content intro-content--compact' : 'stack intro-content'}>
      {compact ? (
        <Text preset={TEXT_PRESET.heading2} className="visually-hidden">{t.intro.title}</Text>
      ) : (
        <>
          <Text preset={TEXT_PRESET.heading1} as="h2">{t.intro.title}</Text>
          <Text preset={TEXT_PRESET.paragraph}>{voteMode === 'range' ? t.intro.whatRange : t.intro.what}</Text>
        </>
      )}
      <Text preset={TEXT_PRESET.paragraph}>
        {before}
        <strong>{count}</strong>
        {after}
      </Text>
      <Text preset={TEXT_PRESET.paragraph} className="intro-content__anonymity">
        {t.intro.anonymity[anonymity]}
      </Text>

      <Text preset={TEXT_PRESET.heading3}>{voteMode === 'range' ? t.intro.scaleTitle : t.intro.colorsTitle}</Text>
      {voteMode === 'range' && <Text preset={TEXT_PRESET.paragraph}>{t.intro.scaleHint}</Text>}
      <VoteLegend mode={voteMode} />

      <Text preset={TEXT_PRESET.heading3}>{t.intro.trendsTitle}</Text>
      <Text preset={TEXT_PRESET.paragraph}>{t.intro.trendsHint}</Text>
      <div className="grid-3 intro-content__trends">
        {TREND_OPTIONS.map(({ value, label, icon }) => (
          <Card key={value} className="card-body card-compact intro-content__trend" color={CARD_COLOR.neutral}>
            <Icon name={icon} className="intro-content__trend-icon" />
            <Text preset={TEXT_PRESET.paragraph} className="intro-content__trend-label">
              {label}
            </Text>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default IntroContent;
