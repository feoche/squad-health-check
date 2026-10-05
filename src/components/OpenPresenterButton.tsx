import { Button, BUTTON_SIZE, BUTTON_VARIANT, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

const presenterUrl = (code: string) =>
  `${window.location.origin}${window.location.pathname}#/session/${code}/present`;

/** Opens the screen-share window (re-focused if already open). */
function OpenPresenterButton({ code, className }: { code: string; className?: string }) {
  const open = () => {
    const win = window.open(
      presenterUrl(code),
      `shc-present-${code}`,
      'popup,width=1280,height=800',
    );
    if (win) win.focus();
    else window.alert(t.presenter.allowPopups);
  };

  return (
    <Button
      className={className}
      size={BUTTON_SIZE.sm}
      variant={BUTTON_VARIANT.ghost}
      onClick={open}
    >
      <Icon name={ICON_NAME.monitor} />
      {t.presenter.open}
      <Icon name={ICON_NAME.externalLink} />
    </Button>
  );
}

export default OpenPresenterButton;
