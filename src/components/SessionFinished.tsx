import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import VoteMatrix from './VoteMatrix';
import VoteSummary from './VoteSummary';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

interface Props {
  session: ClientSessionState;
}

/** Shared recap: votes only — notes and exports live in the facilitator view. */
function SessionFinished({ session }: Props) {
  return (
    <div className="page session-finished">
      <div className="stack stack-center session-finished__intro">
        <Text preset={TEXT_PRESET.heading2}>{t.finished.title}</Text>
        <Text preset={TEXT_PRESET.paragraph}>{t.finished.intro}</Text>
      </div>

      <div className="session-finished__cards">
        {session.allResults.map((result) => {
          const cat = session.categories[result.categoryIndex];
          return (
            <Card key={result.categoryIndex} className="card-body session-finished__card">
              <div className="inline wrap session-finished__heading">
                <Text preset={TEXT_PRESET.heading4}>
                  {result.categoryIndex + 1}. {localizeCategory(cat).title} ({t.votes(result.votes.length)})
                </Text>
                <VoteSummary votes={result.votes} prefix={false} />
              </div>
              <VoteMatrix votes={result.votes} compact />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default SessionFinished;
