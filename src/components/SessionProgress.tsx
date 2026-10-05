import { Badge, BADGE_COLOR, ProgressBar, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import HeaderSlot from './HeaderSlot';
import SessionCodeButton from './SessionCodeButton';
import { t } from '../lib/i18n';

interface Props {
  session: ClientSessionState;
  /** The shared screen shows the code as a plain badge, with nothing to click. */
  copyable?: boolean;
}

/** Navbar content: category progress during a round, then the session code (a click copies the link to join, except on the shared screen). */
function SessionProgress({ session, copyable = true }: Props) {
  const { currentCategoryIndex: index, categories, phase } = session;
  const inRound = phase === 'voting' || phase === 'revealed';

  return (
    <HeaderSlot>
      <div className="header-progress">
        {inRound && (
          <>
            <Text preset={TEXT_PRESET.label} className="header-progress-label">
              <span className="hide-mobile">{t.categoryOf(index + 1, categories.length)}</span>
              <span className="show-mobile">
                {index + 1}/{categories.length}
              </span>
            </Text>
            <ProgressBar
              className="header-progress-bar"
              value={index + 1}
              max={categories.length}
              aria-label={t.voting.sessionProgress}
            />
          </>
        )}
        {copyable ? (
          <SessionCodeButton code={session.code} />
        ) : (
          <Badge color={BADGE_COLOR.neutral}>
            <span>{t.code(session.code)}</span>
          </Badge>
        )}
      </div>
    </HeaderSlot>
  );
}

export default SessionProgress;
