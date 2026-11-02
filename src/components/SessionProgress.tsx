import type { ReactNode } from 'react';
import { ProgressBar, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import HeaderSlot from './HeaderSlot';
import RoundTimer from './RoundTimer';
import SessionCodeButton from './SessionCodeButton';
import { t } from '../lib/i18n';

interface Props {
  session: ClientSessionState;
  /** Extra navbar buttons, placed just before the session code */
  children?: ReactNode;
}

/** Navbar content: category progress and time spent during a round, any extra buttons, then the session code (a click copies the link to join). */
function SessionProgress({ session, children }: Props) {
  const { currentCategoryIndex: index, categories, phase } = session;
  const inRound = phase === 'voting' || phase === 'revealed';

  return (
    <HeaderSlot>
      <div className="session-progress">
        {inRound && (
          <>
            <Text preset={TEXT_PRESET.label} className="session-progress__label">
              <span className="hide-mobile">{t.categoryOf(index + 1, categories.length)}</span>
              <span className="show-mobile">
                {index + 1}/{categories.length}
              </span>
            </Text>
            <ProgressBar
              className="session-progress__bar"
              value={index + 1}
              max={categories.length}
              aria-label={t.voting.sessionProgress}
            />
          </>
        )}
        {inRound && session.roundStartedAt !== null && (
          <RoundTimer
            key={`${index}-${session.roundStartedAt}`}
            startedAt={session.roundStartedAt}
            categoryMinutes={session.categoryMinutes}
          />
        )}
        {children}
        <SessionCodeButton code={session.code} />
      </div>
    </HeaderSlot>
  );
}

export default SessionProgress;
