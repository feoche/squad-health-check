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
import { sharedNamedVotes } from '../lib/deriveClientState';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

/** The screen-shared view: no controls and no notes, in any phase (the share link stays copyable). */
function PresenterView({ session }: { session: ClientSessionState }) {
  const { phase, categories, currentCategoryIndex } = session;

  if (phase === 'finished') return <div className="presenter-view presenter-view--finished"><SessionFinished session={session} /></div>;

  if (phase === 'lobby') {
    return (
      <div className="page page-narrow presenter-view presenter-view--lobby">
        <Card className="card-body presenter-view__lobby">
          <Text preset={TEXT_PRESET.heading2} className="presenter-view__join-title">{t.presenter.joinTitle}</Text>
          <SharePanel code={session.code} />
          <div className="stack presenter-view__participants">
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
      <div className="page presenter-view presenter-view--intro">
        <IntroContent categories={categories} anonymity={session.anonymity} />
      </div>
    );
  }

  const category = categories[currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);

  return (
    <div className={`page presenter-view presenter-view--round presenter-view--${phase}`}>
      <SessionProgress session={session} copyable={false} />

      <div className="presenter-view__category">
        <Text preset={TEXT_PRESET.heading1} className="presenter-view__title">{title}</Text>
        {subtitle && <Text preset={TEXT_PRESET.paragraph} className="presenter-view__subtitle">{subtitle}</Text>}
        <ColorCards category={category} large />
      </div>

      {phase === 'voting' && (
        <VoteProgress voteCount={session.voteCount} totalVoters={session.totalVoters} />
      )}

      {phase === 'revealed' &&
        (session.currentResults ? (
          <ResultsGrid
            votes={session.currentResults}
            namedVotes={sharedNamedVotes(session, currentCategoryIndex)}
          />
        ) : (
          <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
        ))}
    </div>
  );
}

export default PresenterView;
