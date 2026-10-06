import { Card } from '@ovhcloud/ods-react';
import { NamedVote, Vote } from '../types';
import NamedVotes from './NamedVotes';
import VoteMatrix from './VoteMatrix';

interface Props {
  votes: Vote[];
  /** Who voted what, when this audience may see it */
  namedVotes?: NamedVote[];
  inline?: boolean;
}

/**
 * Results in their own card, or `inline` as a section of an enclosing card; the page around titles them.
 * Who voted what sits beside the matrix, 70:30.
 */
function ResultsGrid({ votes, namedVotes, inline = false }: Props) {
  const content = (
    <>
      <div className={namedVotes?.length ? 'results-grid__body results-grid__body--split' : 'results-grid__body'}>
        <div className="table-scroll results-grid__matrix">
          <VoteMatrix votes={votes} />
        </div>
        {namedVotes && <NamedVotes votes={namedVotes} />}
      </div>
    </>
  );
  return inline ? (
    <div className="stack results-grid results-grid--inline">{content}</div>
  ) : (
    <Card className="card-body results-grid">{content}</Card>
  );
}

export default ResultsGrid;
