import {
  Badge,
  BADGE_COLOR,
  Icon,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Category } from '../types';
import ColorCards from './ColorCards';
import { TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

interface Props {
  categories: Category[];
  /** Phone legend: colours, trends and anonymity only */
  compact?: boolean;
}

/** Built-in presentation of the workshop, shown before the first category. */
function IntroContent({ categories, compact = false }: Props) {
  return (
    <div className="stack">
      {!compact && (
        <>
          <Text preset={TEXT_PRESET.heading1}>{t.intro.title}</Text>
          <Text preset={TEXT_PRESET.paragraph}>{t.intro.what}</Text>
        </>
      )}

      <Text preset={TEXT_PRESET.heading3}>{t.intro.colorsTitle}</Text>
      <ColorCards />

      <Text preset={TEXT_PRESET.heading3}>{t.intro.trendsTitle}</Text>
      <Text preset={TEXT_PRESET.paragraph}>{t.intro.trendsHint}</Text>
      <div className="inline wrap">
        {TREND_OPTIONS.map(({ value, label, icon }) => (
          <Badge key={value} color={BADGE_COLOR.neutral}>
            <Icon name={icon} /> {label}
          </Badge>
        ))}
      </div>

      <Message color={MESSAGE_COLOR.information} dismissible={false}>
        <MessageIcon name={ICON_NAME.circleInfo} />
        <MessageBody>{t.intro.anonymous}</MessageBody>
      </Message>

      {!compact && (
        <>
          <Text preset={TEXT_PRESET.heading3}>
            {t.lobby.categoriesToReview(categories.length)}
          </Text>
          <ol className="steps">
            {categories.map((category, i) => (
              <li key={i}>
                <Text preset={TEXT_PRESET.paragraph}>{localizeCategory(category).title}</Text>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export default IntroContent;
