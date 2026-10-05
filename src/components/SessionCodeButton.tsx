import { useEffect, useState } from 'react';
import {
  Button,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  Icon,
  ICON_NAME,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ovhcloud/ods-react';
import { sessionUrl } from '../lib/sessionUrl';
import { t } from '../lib/i18n';

const COPIED_FEEDBACK_MS = 2000;

/** The session code in the navbar: one click copies the link to join. */
function SessionCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(sessionUrl(code)).then(
      () => setCopied(true),
      () => {
        /* Clipboard refused (insecure context, permissions): the code stays readable */
      },
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={copied ? 'session-code-button session-code-button--copied' : 'session-code-button'}
          size={BUTTON_SIZE.xs}
          variant={BUTTON_VARIANT.outline}
          onClick={copy}
        >
          {t.code(code)}
          <Icon
            className="session-code-button__icon"
            name={copied ? ICON_NAME.check : ICON_NAME.fileCopy}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? t.lobby.linkCopied : t.lobby.copyLink}</TooltipContent>
    </Tooltip>
  );
}

export default SessionCodeButton;
