import {
  Button,
  BUTTON_VARIANT,
  Icon,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ChangeEvent, useRef, useState } from 'react';
import { formatDate } from '../lib/exportReport';
import { exportDate, parseSessionExport, SessionExport } from '../lib/sessionHistory';
import { t } from '../lib/i18n';

interface Props {
  /** The session compared with, if any */
  previous: SessionExport | null;
  onImport: (previous: SessionExport) => void;
  onRemove: () => void;
}

/** Picks the previous session to compare with: imports its JSON export, shows which one is chosen, removes it. */
function PreviousSessionPicker({ previous, onImport, onRemove }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const [invalid, setInvalid] = useState(false);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared so that picking the same file again still fires a change
    input.value = '';
    if (!file) return;
    const data = parseSessionExport(await file.text().catch(() => ''));
    setInvalid(!data);
    if (data) onImport(data);
  };

  const remove = () => {
    setInvalid(false);
    onRemove();
    // The focused button goes away with the comparison
    importButton.current?.focus();
  };

  return (
    <div className="stack previous-session-picker">
      <div className="previous-session-picker__heading">
        <Text preset={TEXT_PRESET.label}>{t.notes.previousTitle}</Text>
        <div role="status">
          <Text preset={TEXT_PRESET.caption}>
            {previous ? t.notes.comparedWith(formatDate(exportDate(previous.date))) : t.notes.previousHint}
          </Text>
        </div>
      </div>

      {invalid && (
        <Message className="message-full" color={MESSAGE_COLOR.critical} dismissible={false} role="alert">
          <MessageIcon name={ICON_NAME.triangleExclamation} />
          <MessageBody>{t.notes.invalidImport}</MessageBody>
        </Message>
      )}

      <div className="inline wrap">
        <Button ref={importButton} variant={BUTTON_VARIANT.outline} onClick={() => fileInput.current?.click()}>
          <Icon name={ICON_NAME.upload} />
          {previous ? t.notes.changePrevious : t.notes.importPrevious}
        </Button>
        {previous && (
          <Button variant={BUTTON_VARIANT.ghost} onClick={remove}>
            <Icon name={ICON_NAME.xmark} />
            {t.notes.removePrevious}
          </Button>
        )}
      </div>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importFile} />
    </div>
  );
}

export default PreviousSessionPicker;
