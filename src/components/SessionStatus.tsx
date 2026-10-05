import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Icon,
  ICON_NAME,
  Link,
  Spinner,
  SPINNER_SIZE,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

export function Connecting() {
  return (
    <div className="stack stack-center connecting">
      <Spinner size={SPINNER_SIZE.lg} />
      <Text preset={TEXT_PRESET.paragraph}>{t.connecting}</Text>
    </div>
  );
}

interface NoticeProps {
  title: string;
  backTo: string;
  backLabel: string;
}

export function SessionNotice({ title, backTo, backLabel }: NoticeProps) {
  return (
    <div className="page page-narrow session-notice">
      <Card className="card-body stack-center session-notice__card">
        <Text preset={TEXT_PRESET.heading2}>{title}</Text>
        <Link className="session-notice__back" as={RouterLink} to={backTo}>
          <Icon name={ICON_NAME.arrowLeft} />
          {backLabel}
        </Link>
      </Card>
    </div>
  );
}
