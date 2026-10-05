import { Button, BUTTON_SIZE, BUTTON_VARIANT, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

const notesUrl = (code: string) =>
  `${window.location.origin}${window.location.pathname}#/session/${code}/notes`;

/**
 * Opens the private notes in a separate window (re-focused if already open),
 * so the screen-shared window never shows them.
 */
function OpenNotesButton({ code, className }: { code: string; className?: string }) {
  const open = () => {
    const win = window.open(notesUrl(code), `shc-notes-${code}`, 'popup,width=720,height=900');
    if (win) win.focus();
    else window.alert(t.notes.allowPopups);
  };

  return (
    <Button
      className={className}
      size={BUTTON_SIZE.sm}
      variant={BUTTON_VARIANT.ghost}
      onClick={open}
    >
      <Icon name={ICON_NAME.pen} />
      {t.notes.button}
      <Icon name={ICON_NAME.externalLink} />
    </Button>
  );
}

export default OpenNotesButton;
