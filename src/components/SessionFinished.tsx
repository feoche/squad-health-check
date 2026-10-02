import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import VoteMatrix from './VoteMatrix';
import OpenNotesButton from './OpenNotesButton';

interface Props {
  session: ClientSessionState;
}

/** Shared recap: votes only — notes and exports live in the facilitator notes window. */
function SessionFinished({ session }: Props) {
  return (
    <div className="page">
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading2}>Session Complete!</Text>
        <Text preset={TEXT_PRESET.paragraph}>
          Here&apos;s the summary of all results from the health check.
        </Text>
      </div>

      <div className="category-cards">
        {session.allResults.map((result) => {
          const cat = session.categories[result.categoryIndex];
          return (
            <Card key={result.categoryIndex} className="card-body">
              <Text preset={TEXT_PRESET.heading4}>
                {result.categoryIndex + 1}. {cat.name}
              </Text>
              <Text preset={TEXT_PRESET.caption}>
                {result.votes.length} vote{result.votes.length !== 1 ? 's' : ''}
              </Text>
              <VoteMatrix votes={result.votes} compact />
            </Card>
          );
        })}
      </div>

      {session.isFacilitator && (
        <div className="stack stack-center">
          <Text preset={TEXT_PRESET.paragraph}>
            Notes and downloads are in your facilitator notes.
          </Text>
          <OpenNotesButton code={session.code} />
        </div>
      )}
    </div>
  );
}

export default SessionFinished;
