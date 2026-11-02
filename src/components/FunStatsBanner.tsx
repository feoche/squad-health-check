import { Card, CARD_COLOR, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { FunStat } from '../lib/funStats';
import { t } from '../lib/i18n';

/**
 * A few fun facts about the whole health check, in place of the "session complete" title.
 */
function FunStatsBanner({ stats }: { stats: FunStat[] }) {
  return (
    <section className="stack stack-center fun-stats" aria-labelledby="fun-stats-title">
      <Text preset={TEXT_PRESET.heading2} as="h2" id="fun-stats-title">
        {t.funStats.title}
      </Text>
      <ul className="fun-stats__list">
        {stats.map(({ id, emoji, params }) => (
          <li key={id} className="fun-stats__item">
            <Card className="card-body card-compact fun-stats__card" color={CARD_COLOR.primary}>
              <span className="fun-stats__emoji" aria-hidden="true">{emoji}</span>
              <Text preset={TEXT_PRESET.heading5} as="h3">{t.funStats[id].title}</Text>
              <Text preset={TEXT_PRESET.paragraph}>{t.funStats[id].text(params)}</Text>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default FunStatsBanner;
