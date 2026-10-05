import {
  Card,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
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

  if (phase === 'finished') {
    return (
      <div className="page page-narrow">
        <div className="stack stack-center">
          <Text preset={TEXT_PRESET.heading2}>{t.finished.title}</Text>
          <Text preset={TEXT_PRESET.paragraph}>{t.finished.participantIntro}</Text>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="page page-narrow">
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading4}>
            {t.lobby.participants(session.participants.length)}
          </Text>
          <ParticipantBadges
            participants={session.participants}
            facilitatorId={session.facilitatorId}
            myId={session.myId}
          />
          <div className="stack stack-center">
            <Spinner />
            <Text preset={TEXT_PRESET.paragraph}>{t.lobby.waiting}</Text>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="page">
        <Message color={MESSAGE_COLOR.information} dismissible={false}>
          <MessageIcon name={ICON_NAME.circleInfo} />
          <MessageBody>{t.participant.intro}</MessageBody>
        </Message>
        <IntroContent categories={categories} compact />
      </div>
    );
  }

  const category = categories[currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);
  const isPicking = phase === 'voting' && !session.hasVoted;

  return (
    <div className="page participant-round">
      <SessionProgress session={session} />

      <div className="category-header">
        <Text preset={TEXT_PRESET.heading2}>{title}</Text>
        {subtitle && <Text>{subtitle}</Text>}
        {/* While picking, the descriptions live in the vote tiles instead */}
        {!isPicking && <ColorCards category={category} />}
      </div>

      {isPicking && (
        <VotingPanel key={currentCategoryIndex} category={category} onSubmitVote={onSubmitVote} />
      )}

      {phase === 'voting' && session.hasVoted && <VoteSubmitted />}

      {phase === 'revealed' && (
        <Text preset={TEXT_PRESET.paragraph} className="stack-center">
          {t.participant.resultsOnScreen}
        </Text>
      )}
    </div>
  );
}

export default ParticipantView;
