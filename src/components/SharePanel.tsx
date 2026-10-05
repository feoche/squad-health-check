import {
  Clipboard,
  ClipboardControl,
  ClipboardTrigger,
  FormField,
  FormFieldLabel,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { QRCodeSVG } from 'qrcode.react';
import { t } from '../lib/i18n';

// Always share the published app, even from a local dev server, so the link
// and QR code work for participants on other devices.
const PUBLIC_APP_URL = 'https://feoche.github.io/squad-health-check/';

/** Session code, QR code and copyable link — everything needed to join. */
function SharePanel({
  code,
  copyable = true,
}: {
  code: string;
  /** The shared screen shows the link without a copy button. */
  copyable?: boolean;
}) {
  const shareUrl = `${PUBLIC_APP_URL}#/session/${code}`;

  return (
    <>
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.label}>{t.lobby.sessionCode}</Text>
        <Text preset={TEXT_PRESET.heading1} as="p" className="session-code">
          {code}
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

      {copyable ? (
        <FormField>
          <FormFieldLabel>{t.lobby.shareLink}</FormFieldLabel>
          <Clipboard value={shareUrl}>
            <ClipboardControl />
            <ClipboardTrigger labelCopy={t.lobby.copyLink} labelCopySuccess={t.lobby.linkCopied} />
          </Clipboard>
        </FormField>
      ) : (
        <div className="stack stack-center">
          <Text preset={TEXT_PRESET.label}>{t.lobby.shareLink}</Text>
          <Text preset={TEXT_PRESET.paragraph}>{shareUrl}</Text>
        </div>
      )}
    </>
  );
}

export default SharePanel;
