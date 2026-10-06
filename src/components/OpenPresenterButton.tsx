import { Button, BUTTON_SIZE, BUTTON_VARIANT, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

const presenterUrl = (code: string) =>
  `${window.location.origin}${window.location.pathname}#/session/${code}/present`;

interface Props {
  code: string;
  className?: string;
  /** Navbar variant: sized like the session code button, icon only on phones */
  inHeader?: boolean;
}

/** Opens the screen-share window (re-focused if already open). */
function OpenPresenterButton({ code, className, inHeader = false }: Props) {
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
      className={className ? `open-presenter-button ${className}` : 'open-presenter-button'}
      size={inHeader ? BUTTON_SIZE.xs : BUTTON_SIZE.sm}
      variant={inHeader ? BUTTON_VARIANT.outline : BUTTON_VARIANT.ghost}
      aria-label={t.presenter.open}
      onClick={open}
    >
      <Icon name={ICON_NAME.monitor} />
      <span className={inHeader ? 'hide-mobile' : undefined}>{t.presenter.open}</span>
      <Icon name={ICON_NAME.externalLink} />
    </Button>
  );
}

export default OpenPresenterButton;
