import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import NamedVotes from './NamedVotes';
import VoteMatrix from './VoteMatrix';
import { sharedNamedVotes } from '../lib/deriveClientState';
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
              <Text preset={TEXT_PRESET.heading4}>
                {result.categoryIndex + 1}. {localizeCategory(cat).title}
              </Text>
              <Text preset={TEXT_PRESET.caption}>
                {t.votes(result.votes.length)}
              </Text>
              <VoteMatrix votes={result.votes} compact />
              {sharedNamedVotes(session, result.categoryIndex) && (
                <NamedVotes votes={sharedNamedVotes(session, result.categoryIndex)!} />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default SessionFinished;
