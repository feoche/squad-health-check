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
import { sessionUrl } from '../lib/sessionUrl';
import { t } from '../lib/i18n';

/** Session code, QR code and copyable link — everything needed to join. */
function SharePanel({ code }: { code: string }) {
  const shareUrl = sessionUrl(code);

  return (
    <div className="stack share-panel">
      <div className="stack stack-center share-panel__code-block">
        <Text preset={TEXT_PRESET.label}>{t.lobby.sessionCode}</Text>
        <Text preset={TEXT_PRESET.heading1} as="p" className="share-panel__code">
          {code}
        </Text>
      </div>

      <div className="stack stack-center share-panel__qr-block">
        <QRCodeSVG
          value={shareUrl}
          size={192}
          marginSize={2}
          className="share-panel__qr"
          title={t.lobby.qrTitle}
        />
        <Text preset={TEXT_PRESET.caption}>{t.lobby.scanToJoin}</Text>
      </div>

      <FormField className="share-panel__link">
        <FormFieldLabel>{t.lobby.shareLink}</FormFieldLabel>
        <Clipboard value={shareUrl}>
          <ClipboardControl />
          <ClipboardTrigger labelCopy={t.lobby.copyLink} labelCopySuccess={t.lobby.linkCopied} />
        </Clipboard>
      </FormField>
    </div>
  );
}

export default SharePanel;
