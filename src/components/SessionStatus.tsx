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

export function Connecting() {
  return (
    <div className="stack stack-center loading">
      <Spinner size={SPINNER_SIZE.lg} />
      <Text preset={TEXT_PRESET.paragraph}>Connecting to session…</Text>
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
    <div className="page page-narrow">
      <Card className="card-body stack-center">
        <Text preset={TEXT_PRESET.heading2}>{title}</Text>
        <Link as={RouterLink} to={backTo}>
          <Icon name={ICON_NAME.arrowLeft} />
          {backLabel}
        </Link>
      </Card>
    </div>
  );
}
