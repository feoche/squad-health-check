import { Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

function VoteSubmitted() {
  return (
    <div className="stack stack-center">
      <Text preset={TEXT_PRESET.heading3}>
        <Icon name={ICON_NAME.circleCheck} /> {t.voting.submitted}
      </Text>
      <Text preset={TEXT_PRESET.paragraph}>{t.participant.waitingOthers}</Text>
    </div>
  );
}

export default VoteSubmitted;
