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
  };

  return (
    <>
      <Button variant={BUTTON_VARIANT.ghost} onClick={() => fileInput.current?.click()}>
        <Icon name={ICON_NAME.upload} />
        {t.notes.importPrevious}
      </Button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importFile} />

      {invalid && (
        <Message className="message-full" color={MESSAGE_COLOR.critical} dismissible={false}>
          <MessageIcon name={ICON_NAME.triangleExclamation} />
          <MessageBody>{t.notes.invalidImport}</MessageBody>
        </Message>
      )}

      {previous && (
        <div className="inline wrap previous-session-picker__chosen">
          <Text preset={TEXT_PRESET.caption}>{t.notes.comparedWith(formatDate(exportDate(previous.date)))}</Text>
          <Button variant={BUTTON_VARIANT.ghost} onClick={remove}>
            <Icon name={ICON_NAME.trash} />
            {t.notes.removePrevious}
          </Button>
        </div>
      )}
    </>
  );
}

export default PreviousSessionPicker;
