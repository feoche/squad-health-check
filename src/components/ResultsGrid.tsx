import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import VoteMatrix from './VoteMatrix';
import { t } from '../lib/i18n';

function ResultsGrid({ votes }: { votes: Vote[] }) {
  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.heading3}>{t.results.title(votes.length)}</Text>
      <div className="table-scroll">
        <VoteMatrix votes={votes} />
      </div>
    </Card>
  );
}

export default ResultsGrid;
