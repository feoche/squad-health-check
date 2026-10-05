import { useState } from 'react';
import {
  Card,
  Spinner,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import ColorCards from './ColorCards';
import IntroContent from './IntroContent';
import ParticipantBadges from './ParticipantBadges';
import SessionProgress from './SessionProgress';
import VoteSubmitted from './VoteSubmitted';
import VotingPanel from './VotingPanel';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
}

/** A participant's phone: the vote form must fit one screen, so no counter here. */
function ParticipantView({ session, onSubmitVote }: Props) {
  const { phase, categories, currentCategoryIndex } = session;
  /* Tied to the round, so moving on to the next category ends the edit */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (phase === 'finished') {
    return (
      <div className="page page-narrow participant-view participant-view--finished">
        <div className="stack stack-center participant-view__finished">
          <Text preset={TEXT_PRESET.heading2}>{t.finished.title}</Text>
          <Text preset={TEXT_PRESET.paragraph}>{t.finished.participantIntro}</Text>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="page page-narrow participant-view participant-view--lobby">
        <Card className="card-body participant-view__lobby">
          <Text preset={TEXT_PRESET.heading4}>
            {t.lobby.participants(session.participants.length)}
          </Text>
          <ParticipantBadges
            participants={session.participants}
            facilitatorId={session.facilitatorId}
            myId={session.myId}
          />
          <div className="stack stack-center participant-view__waiting">
            <Spinner />
            <Text preset={TEXT_PRESET.paragraph}>{t.lobby.waiting}</Text>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="page participant-view participant-view--intro">
        <IntroContent categories={categories} compact />
      </div>
    );
  }

  const category = categories[currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);
  const isEditing = session.hasVoted && session.myVote !== null && editingIndex === currentCategoryIndex;
  const isPicking = phase === 'voting' && (!session.hasVoted || isEditing);

  return (
    <div className={`page participant-view participant-view--round participant-view--${phase}`}>
      <SessionProgress session={session} />

      <div className="participant-view__category">
        <Text preset={TEXT_PRESET.heading2} className="participant-view__title">{title}</Text>
        {subtitle && <Text className="participant-view__subtitle">{subtitle}</Text>}
        {/* While picking, the descriptions live in the vote tiles instead */}
        {!isPicking && <ColorCards category={category} />}
      </div>

      {isPicking && (
        <VotingPanel
          key={`${currentCategoryIndex}-${isEditing}`}
          category={category}
          initialVote={isEditing ? session.myVote : null}
          onCancel={isEditing ? () => setEditingIndex(null) : undefined}
          onSubmitVote={(color, trend) => {
            setEditingIndex(null);
            onSubmitVote(color, trend);
          }}
        />
      )}

      {phase === 'voting' && session.hasVoted && !isEditing && (
        <VoteSubmitted
          onEdit={session.myVote ? () => setEditingIndex(currentCategoryIndex) : undefined}
        />
      )}

      {phase === 'revealed' && (
        <Text preset={TEXT_PRESET.paragraph} className="stack-center participant-view__results-hint">
          {t.participant.resultsOnScreen}
        </Text>
      )}
    </div>
  );
}

export default ParticipantView;
