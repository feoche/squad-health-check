import { useEffect, useState } from 'react';
import { Badge, BADGE_COLOR, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { formatElapsed, isOverSlot } from '../lib/roundTimer';
import { subscribeServerTimeOffset } from '../lib/sessionStore';
import { t } from '../lib/i18n';

interface Props {
  /** Server time the round opened */
  startedAt: number;
  categoryMinutes: number;
}

/** Time spent on the current category; turns to the warning colour, quietly, once past the slot. */
function RoundTimer({ startedAt, categoryMinutes }: Props) {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeServerTimeOffset(setOffset), []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = now + offset - startedAt;
  const over = isOverSlot(elapsed, categoryMinutes);
  const time = formatElapsed(elapsed);

  return (
    <Badge
      role="timer"
      className={`round-timer${over ? ' round-timer--over' : ''}`}
      color={over ? BADGE_COLOR.warning : BADGE_COLOR.neutral}
      title={over ? t.timer.over : t.timer.label}
      aria-label={`${over ? t.timer.over : t.timer.label}: ${time}`}
    >
      <Icon name={ICON_NAME.timer} aria-hidden />
      <span>{time}</span>
    </Badge>
  );
}

export default RoundTimer;
