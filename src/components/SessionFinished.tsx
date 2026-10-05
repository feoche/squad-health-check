import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import VoteMatrix from './VoteMatrix';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

interface Props {
  session: ClientSessionState;
}

/** Shared recap: votes only — notes and exports live in the facilitator view. */
function SessionFinished({ session }: Props) {
  return (
    <div className="page">
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading2}>{t.finished.title}</Text>
        <Text preset={TEXT_PRESET.paragraph}>{t.finished.intro}</Text>
      </div>

      <div className="category-cards">
        {session.allResults.map((result) => {
          const cat = session.categories[result.categoryIndex];
          return (
            <Card key={result.categoryIndex} className="card-body">
              <Text preset={TEXT_PRESET.heading4}>
                {result.categoryIndex + 1}. {localizeCategory(cat).title}
              </Text>
              <Text preset={TEXT_PRESET.caption}>
                {t.votes(result.votes.length)}
              </Text>
              <VoteMatrix votes={result.votes} compact />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default SessionFinished;
