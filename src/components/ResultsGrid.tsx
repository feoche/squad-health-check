import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import VoteMatrix from './VoteMatrix';
import { t } from '../lib/i18n';

/** Results in their own card, or `inline` as a section of an enclosing card. */
function ResultsGrid({ votes, inline = false }: { votes: Vote[]; inline?: boolean }) {
  const content = (
    <>
      <Text preset={inline ? TEXT_PRESET.heading4 : TEXT_PRESET.heading3}>
        {t.results.title(votes.length)}
      </Text>
      <div className="table-scroll">
        <VoteMatrix votes={votes} />
      </div>
    </>
  );
  return inline ? content : <Card className="card-body">{content}</Card>;
}

export default ResultsGrid;
