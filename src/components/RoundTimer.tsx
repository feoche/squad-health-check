import { useEffect, useState } from 'react';
import { Badge, BADGE_COLOR, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { formatElapsed, isFarOverSlot, isOverSlot } from '../lib/roundTimer';
import { subscribeServerTimeOffset } from '../lib/sessionStore';
import { t } from '../lib/i18n';

interface Props {
  /** Server time the round opened */
  startedAt: number;
  categoryMinutes: number;
}

/**
 * Time spent on the current category; turns to the warning colour, quietly, once past the slot, then critical at 150% of it.
 * The icon changes with the colour, so the overrun does not rely on colour alone.
 */
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
  const farOver = isFarOverSlot(elapsed, categoryMinutes);
  const time = formatElapsed(elapsed);
  const label = farOver ? t.timer.farOver : over ? t.timer.over : t.timer.label;

  return (
    <Badge
      role="timer"
      className={`round-timer${over ? ' round-timer--over' : ''}`}
      color={farOver ? BADGE_COLOR.critical : over ? BADGE_COLOR.warning : BADGE_COLOR.information}
      title={label}
      aria-label={`${label}: ${time}`}
    >
      <Icon
        name={farOver ? ICON_NAME.hexagonExclamation : over ? ICON_NAME.triangleExclamation : ICON_NAME.timer}
        aria-hidden
      />
      <span>{time}</span>
    </Badge>
  );
}

export default RoundTimer;
