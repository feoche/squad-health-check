import { useRef } from 'react';
import { Button, BUTTON_VARIANT, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import { t } from '../lib/i18n';
import { isRangeVote } from '../lib/voteScore';
import ColorBadge from './ColorBadge';
import { useFocusIfLost } from '../lib/useFocusIfLost';

interface Props {
  /** The vote just cast: in colors mode, its colour is recalled as a badge */
  vote?: Vote | null;
  /** Shown once the vote can be edited (its ballot has loaded) */
  onEdit?: () => void;
}

function VoteSubmitted({ vote, onEdit }: Props) {
  /* Replaces the vote form, whose submit button had the focus: confirm the vote from there */
  const container = useRef<HTMLDivElement>(null);
  useFocusIfLost(container);

  return (
    <div className="stack stack-center vote-submitted" ref={container} tabIndex={-1}>
      <Text preset={TEXT_PRESET.heading3}>
        <Icon name={ICON_NAME.circleCheck} /> {t.voting.submitted}
      </Text>
      {vote && !isRangeVote(vote) && <ColorBadge color={vote.color} large />}
      <Text preset={TEXT_PRESET.paragraph}>{t.participant.waitingOthers}</Text>
      {onEdit && (
        <Button variant={BUTTON_VARIANT.outline} onClick={onEdit}>
          <Icon name={ICON_NAME.pen} /> {t.voting.edit}
        </Button>
      )}
    </div>
  );
}

export default VoteSubmitted;
