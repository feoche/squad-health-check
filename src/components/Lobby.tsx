import {
  Badge,
  BADGE_COLOR,
  Button,
  Card,
  Clipboard,
  ClipboardControl,
  ClipboardTrigger,
  FormField,
  FormFieldLabel,
  Icon,
  ICON_NAME,
  Spinner,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { QRCodeSVG } from 'qrcode.react';
import { ClientSessionState } from '../types';
import OpenNotesButton from './OpenNotesButton';
import { t } from '../lib/i18n';

// Always share the published app, even from a local dev server, so the link
// and QR code work for participants on other devices.
const PUBLIC_APP_URL = 'https://feoche.github.io/squad-health-check/';

interface Props {
  session: ClientSessionState;
  onStartVoting: () => void;
}

function Lobby({ session, onStartVoting }: Props) {
  const myId = session.myId;
  const shareUrl = `${PUBLIC_APP_URL}#/session/${session.code}`;
  const count = session.participants.length;

  return (
    <div className="page page-narrow">
      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading2}>{t.lobby.title}</Text>

        <div className="stack stack-center">
          <Text preset={TEXT_PRESET.label}>{t.lobby.sessionCode}</Text>
          <Text preset={TEXT_PRESET.heading1} as="p" className="session-code">
            {session.code}
          </Text>
        </div>

        <div className="stack stack-center">
          <QRCodeSVG
            value={shareUrl}
            size={192}
            marginSize={2}
            className="session-qr"
            title={t.lobby.qrTitle}
          />
          <Text preset={TEXT_PRESET.caption}>{t.lobby.scanToJoin}</Text>
        </div>

        <FormField>
          <FormFieldLabel>{t.lobby.shareLink}</FormFieldLabel>
          <Clipboard value={shareUrl}>
            <ClipboardControl />
            <ClipboardTrigger labelCopy={t.lobby.copyLink} labelCopySuccess={t.lobby.linkCopied} />
          </Clipboard>
        </FormField>

        <div className="stack">
          <Text preset={TEXT_PRESET.heading4}>{t.lobby.participants(count)}</Text>
          <div className="inline wrap">
            {session.participants.map((p) => (
              <Badge
                key={p.id}
                color={p.id === myId ? BADGE_COLOR.primary : BADGE_COLOR.neutral}
              >
                {p.id === session.facilitatorId && <Icon name={ICON_NAME.crown} />}
                {p.name}
                {p.id === myId && t.lobby.you}
              </Badge>
            ))}
          </div>
        </div>

        <Text preset={TEXT_PRESET.paragraph}>
          {t.lobby.categoriesToReview(session.categories.length)}
        </Text>

        {session.isFacilitator ? (
          <div className="actions">
            <Button onClick={onStartVoting} disabled={count < 1}>
              {t.lobby.startVoting(count)}
            </Button>
            <OpenNotesButton className="desktop-only" code={session.code} />
          </div>
        ) : (
          <div className="stack stack-center">
            <Spinner />
            <Text preset={TEXT_PRESET.paragraph}>
              {t.lobby.waiting}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Lobby;
