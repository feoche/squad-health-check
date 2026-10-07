import { Button, BUTTON_SIZE, BUTTON_VARIANT, Card, CARD_COLOR, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';
import { NamedVote, Vote } from '../types';
import NamedVotes from './NamedVotes';
import VoteMatrix from './VoteMatrix';

interface Props {
  votes: Vote[];
  /** Who voted what, when this audience may see it */
  namedVotes?: NamedVote[];
  inline?: boolean;
  /** Facilitator only: their votes for people without the app, and the way to add or remove them */
  offlineVotes?: Vote[];
  onAdjust?: (vote: Vote, delta: 1 | -1) => void;
  /** Removes every vote the facilitator added in this round */
  onResetOffline?: () => void;
}

/**
 * Results in their own card, or `inline` as a section of an enclosing card; the page around titles them.
 * Who voted what sits beside the matrix, 70:30.
 */
function ResultsGrid({ votes, namedVotes, inline = false, offlineVotes, onAdjust, onResetOffline }: Props) {
  const content = (
    <>
      <div className={namedVotes?.length ? 'results-grid__body results-grid__body--split' : 'results-grid__body'}>
        <div className="table-scroll results-grid__matrix">
          <VoteMatrix votes={votes} offlineVotes={offlineVotes} onAdjust={onAdjust} />
        </div>
        {namedVotes && <NamedVotes votes={namedVotes} />}
      </div>
      {onAdjust && (
        <div className="inline wrap results-grid__offline">
          <Text preset={TEXT_PRESET.caption} aria-live="polite">
            {t.facilitator.offlineHint}
            {offlineVotes?.length ? ` ${t.facilitator.offlineCount(offlineVotes.length)}` : ''}
          </Text>
          {onResetOffline && offlineVotes?.length ? (
            <Button size={BUTTON_SIZE.xs} variant={BUTTON_VARIANT.outline} onClick={onResetOffline}>
              <Icon name={ICON_NAME.undo} />
              {t.facilitator.resetOffline}
            </Button>
          ) : null}
        </div>
      )}
    </>
  );
  return inline ? (
    <div className="stack results-grid results-grid--inline">{content}</div>
  ) : (
    <Card className="card-body results-grid" color={CARD_COLOR.neutral}>{content}</Card>
  );
}

export default ResultsGrid;
