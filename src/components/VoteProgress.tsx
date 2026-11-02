import { ProgressBar, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

function VoteProgress({ voteCount, totalVoters }: { voteCount: number; totalVoters: number }) {
  return (
    <div className="stack stack-center vote-progress">
      <Text preset={TEXT_PRESET.paragraph} className="vote-progress__label" aria-live="polite">{t.votesReceived(voteCount, totalVoters)}</Text>
      <ProgressBar
        className="vote-progress__bar"
        value={voteCount}
        max={totalVoters}
        aria-label={t.voting.votesReceivedLabel}
      />
    </div>
  );
}

export default VoteProgress;
