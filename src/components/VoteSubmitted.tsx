import { Button, BUTTON_VARIANT, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

interface Props {
  /** Shown once the vote can be edited (its ballot has loaded) */
  onEdit?: () => void;
}

function VoteSubmitted({ onEdit }: Props) {
  return (
    <div className="stack stack-center vote-submitted">
      <Text preset={TEXT_PRESET.heading3}>
        <Icon name={ICON_NAME.circleCheck} /> {t.voting.submitted}
      </Text>
      <Text preset={TEXT_PRESET.paragraph}>{t.participant.waitingOthers}</Text>
      {onEdit && (
        <Button variant={BUTTON_VARIANT.outline} onClick={onEdit}>
          <Icon name={ICON_NAME.pen} /> {t.voting.edit}
        </Button>
      )}
    </div>
  );
}

export default VoteSubmitted;
