import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CARD_COLOR,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import ColorCards from './ColorCards';
import IntroContent from './IntroContent';
import ParticipantBadges from './ParticipantBadges';
import ResultsGrid from './ResultsGrid';
import SessionFinished from './SessionFinished';
import SessionProgress from './SessionProgress';
import SharePanel from './SharePanel';
import VoteProgress from './VoteProgress';
import VoteSummary from './VoteSummary';
import { sharedNamedVotes } from '../lib/deriveClientState';
import { LANG, t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

/** The screen-shared view: no controls and no notes, in any phase (the share link stays copyable). */
function PresenterView({ session }: { session: ClientSessionState }) {
  const { phase, categories, currentCategoryIndex } = session;

  if (phase === 'finished') return <div className="presenter-view presenter-view--finished"><SessionFinished session={session} /></div>;

  if (phase === 'lobby') {
    return (
      <div className="page page-narrow presenter-view presenter-view--lobby">
        <Card className="card-body presenter-view__lobby" color={CARD_COLOR.neutral}>
          <Text preset={TEXT_PRESET.heading2} className="presenter-view__join-title">{t.presenter.joinTitle}</Text>
          <SharePanel code={session.code} />
          <div className="stack presenter-view__participants">
            <Text preset={TEXT_PRESET.heading4} as="h3">
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
  const results = phase === 'revealed' ? session.currentResults : null;

  return (
    <div className={`page presenter-view presenter-view--round presenter-view--${phase}`}>
      <SessionProgress session={session} />

      <div className="presenter-view__category">
        <div className="inline wrap presenter-view__heading">
          <Text preset={TEXT_PRESET.heading1} as="h2" className="presenter-view__title">
            {results ? `${title} (${t.votes(results.length)})` : title}
          </Text>
          {results && <VoteSummary votes={results} large />}
        </div>
        {subtitle && (
          <Text
            preset={TEXT_PRESET.paragraph}
            className="presenter-view__subtitle"
            lang={LANG === 'fr' ? 'en' : 'fr'}
          >
            {subtitle}
          </Text>
        )}
        {/* Once revealed, the results come first and the descriptions fold away below them */}
        {phase !== 'revealed' && <ColorCards category={category} large />}
      </div>

      {phase === 'voting' && (
        <VoteProgress voteCount={session.voteCount} totalVoters={session.totalVoters} />
      )}

      {phase === 'revealed' &&
        (results ? (
          <ResultsGrid votes={results} namedVotes={sharedNamedVotes(session, currentCategoryIndex)} />
        ) : (
          <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
        ))}

      {phase === 'revealed' && (
        <Accordion className="presenter-view__descriptions">
          <AccordionItem value="descriptions">
            <AccordionTrigger>
              {/* A heading would lose its role inside the trigger button, so only its look is kept */}
              <Text preset={TEXT_PRESET.heading4} as="span">{t.results.descriptions}</Text>
            </AccordionTrigger>
            <AccordionContent>
              <ColorCards category={category} large />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

export default PresenterView;
