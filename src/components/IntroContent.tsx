import {
  Card,
  Icon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Anonymity, Category } from '../types';
import ColorCards from './ColorCards';
import { TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';

interface Props {
  categories: Category[];
  /** Told before the first vote, so everyone knows who will see it */
  anonymity: Anonymity;
  /** Phone legend: category count, colours and trends only */
  compact?: boolean;
}

/** Built-in presentation of the workshop, shown before the first category. */
function IntroContent({ categories, anonymity, compact = false }: Props) {
  const [before, count, after] = t.intro.categoryCount(categories.length);

  return (
    <div className={compact ? 'stack intro-content intro-content--compact' : 'stack intro-content'}>
      {!compact && (
        <>
          <Text preset={TEXT_PRESET.heading1}>{t.intro.title}</Text>
          <Text preset={TEXT_PRESET.paragraph}>{t.intro.what}</Text>
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

      <Text preset={TEXT_PRESET.heading3}>{t.intro.colorsTitle}</Text>
      <ColorCards />

      <Text preset={TEXT_PRESET.heading3}>{t.intro.trendsTitle}</Text>
      <Text preset={TEXT_PRESET.paragraph}>{t.intro.trendsHint}</Text>
      <div className="grid-3 intro-content__trends">
        {TREND_OPTIONS.map(({ value, label, icon }) => (
          <Card key={value} className="card-body card-compact intro-content__trend">
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
