import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import ColorCards from './ColorCards';
import IntroContent from './IntroContent';
import ParticipantBadges from './ParticipantBadges';
import ResultsGrid from './ResultsGrid';
import SessionFinished from './SessionFinished';
import SessionProgress from './SessionProgress';
import SharePanel from './SharePanel';
import VoteProgress from './VoteProgress';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

/** The screen-shared view: no buttons and no notes, in any phase. */
function PresenterView({ session }: { session: ClientSessionState }) {
  const { phase, categories, currentCategoryIndex } = session;

  if (phase === 'finished') return <div className="presenter"><SessionFinished session={session} /></div>;

  if (phase === 'lobby') {
    return (
      <div className="page page-narrow presenter">
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading2}>{t.presenter.joinTitle}</Text>
          <SharePanel code={session.code} copyable={false} />
          <div className="stack">
            <Text preset={TEXT_PRESET.heading4}>
              {t.lobby.participants(session.participants.length)}
            </Text>
            <ParticipantBadges
              participants={session.participants}
              facilitatorId={session.facilitatorId}
            />
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="page presenter">
        <IntroContent categories={categories} />
      </div>
    );
  }

  const category = categories[currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);

  return (
    <div className={phase === 'revealed' ? 'page presenter presenter-revealed' : 'page presenter'}>
      <SessionProgress session={session} copyable={false} />

      <div className="category-header">
        <Text preset={TEXT_PRESET.heading1}>{title}</Text>
        {subtitle && <Text preset={TEXT_PRESET.paragraph}>{subtitle}</Text>}
        <ColorCards category={category} large />
      </div>

      {phase === 'voting' && (
        <VoteProgress voteCount={session.voteCount} totalVoters={session.totalVoters} />
      )}

      {phase === 'revealed' &&
        (session.currentResults ? (
          <ResultsGrid votes={session.currentResults} />
        ) : (
          <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
        ))}
    </div>
  );
}

export default PresenterView;
