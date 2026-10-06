import { Icon, ICON_NAME, Text, TEXT_PRESET, type IconName } from '@ovhcloud/ods-react';
import { Vote } from '../../types';
import { CategoryExport, Evolution, evolution } from '../../lib/sessionHistory';
import { medianScore } from '../../lib/voteScore';
import { t } from '../../lib/i18n';
import MedianBadge from '../MedianBadge';

const EVOLUTION_ICON: Record<Evolution, IconName> = {
  better: ICON_NAME.arrowUp,
  same: ICON_NAME.equal,
  worse: ICON_NAME.arrowDown,
};

/** The category's median in the imported previous session, and how its health moved since */
function PreviousResult({ previous, votes }: { previous: CategoryExport; votes: Vote[] | undefined }) {
  const change = evolution(previous.median, votes ? medianScore(votes) : null);

  return (
    <span className="inline previous-result">
      <Text preset={TEXT_PRESET.span} as="span">{t.notes.previous}</Text>
      {previous.median === null ? (
        <Text preset={TEXT_PRESET.caption}>{t.results.noVotes}</Text>
      ) : (
        <MedianBadge score={previous.median} />
      )}
      {change && (
        <span className="inline previous-result__evolution">
          <Icon name={EVOLUTION_ICON[change]} aria-hidden />
          {t.notes.evolution[change]}
        </span>
      )}
    </span>
  );
}

export default PreviousResult;
