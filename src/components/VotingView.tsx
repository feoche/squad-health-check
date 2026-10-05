import {
  Badge,
  BADGE_COLOR,
  Card,
  CARD_COLOR,
  type CardColor,
  ProgressBar,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, colorDescription } from './voteOptions';
import VotingPanel from './VotingPanel';
import ResultsGrid from './ResultsGrid';
import OpenNotesButton from './OpenNotesButton';
import HeaderSlot from './HeaderSlot';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

const CARD_COLORS: Record<VoteColor, CardColor> = {
  green: CARD_COLOR.success,
  orange: CARD_COLOR.warning,
  red: CARD_COLOR.critical,
};

interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  onRevealVotes: () => void;
  onNextCategory: () => void;
  onEndSession: () => void;
}

function VotingView({
  session,
  onSubmitVote,
  onRevealVotes,
  onNextCategory,
  onEndSession,
}: Props) {
  const category = session.categories[session.currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);
  const isPicking = session.phase === 'voting' && !session.hasVoted;

  return (
    <div className="page">
      {/* Progress bar, shown in the navbar */}
      <HeaderSlot>
        <div className="header-progress">
          <Text preset={TEXT_PRESET.label} className="header-progress-label">
            <span className="hide-mobile">
              {t.categoryOf(session.currentCategoryIndex + 1, session.categories.length)}
            </span>
            <span className="show-mobile">
              {session.currentCategoryIndex + 1}/{session.categories.length}
            </span>
          </Text>
          <ProgressBar
            className="header-progress-bar"
            value={session.currentCategoryIndex + 1}
            max={session.categories.length}
            aria-label={t.voting.sessionProgress}
          />
          <Badge color={BADGE_COLOR.neutral}>
            <span className="hide-mobile">{t.code(session.code)}</span>
            <span className="show-mobile">{session.code}</span>
          </Badge>
          {session.isFacilitator && (
            <OpenNotesButton className="desktop-only" code={session.code} />
          )}
        </div>
      </HeaderSlot>

      {/* Category */}
      <div className="category-header">
        <Text preset={TEXT_PRESET.heading2}>{title}</Text>
        {subtitle && <Text preset={TEXT_PRESET.caption}>{subtitle}</Text>}
        {/* While picking, the descriptions live in the vote tiles instead */}
        {!isPicking && (
          <div className="grid-3">
            {COLOR_OPTIONS.map((option) => (
              <Card
                key={option.value}
                className="card-body card-compact"
                color={CARD_COLORS[option.value]}
              >
                <Badge className="self-start" color={option.badge}>{option.label}</Badge>
                <Text preset={TEXT_PRESET.paragraph}>
                  {colorDescription(category, option)}
                </Text>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Voting or Results */}
      {session.phase === 'voting' && (
        <VotingPanel
          category={category}
          hasVoted={session.hasVoted}
          voteCount={session.voteCount}
          totalParticipants={session.totalParticipants}
          onSubmitVote={onSubmitVote}
          isFacilitator={session.isFacilitator}
          onRevealVotes={onRevealVotes}
        />
      )}

      {session.phase === 'revealed' && session.currentResults && (
        <ResultsGrid
          votes={session.currentResults}
          isFacilitator={session.isFacilitator}
          isLastCategory={
            session.currentCategoryIndex === session.categories.length - 1
          }
          onNextCategory={onNextCategory}
          onEndSession={onEndSession}
        />
      )}
    </div>
  );
}

export default VotingView;
