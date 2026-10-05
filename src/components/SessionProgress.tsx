import { type ReactNode } from 'react';
import { Badge, BADGE_COLOR, ProgressBar, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import HeaderSlot from './HeaderSlot';
import { t } from '../lib/i18n';

interface Props {
  session: ClientSessionState;
  children?: ReactNode;
}

/** Navbar content: category progress during a round, the session code, then any extra items. */
function SessionProgress({ session, children }: Props) {
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
        <Badge color={BADGE_COLOR.neutral}>
          <span>{t.code(session.code)}</span>
        </Badge>
        {children}
      </div>
    </HeaderSlot>
  );
}

export default SessionProgress;
