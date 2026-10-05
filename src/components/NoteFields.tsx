import { useEffect, useRef, useState } from 'react';
import { FormField, FormFieldLabel, Textarea } from '@ovhcloud/ods-react';
import { FacilitatorNote } from '../types';
import { NoteField } from '../lib/sessionStore';
import { t } from '../lib/i18n';

export const EMPTY_NOTE: FacilitatorNote = { notes: '' };

/**
 * Local copy of a remote value. Remote updates (e.g. from another window) are
 * applied only while the field isn't focused, so the cursor never jumps.
 */
function useSyncedValue(remote: string) {
  const [value, setValue] = useState(remote);
  const focused = useRef(false);
  const latestRemote = useRef(remote);
  latestRemote.current = remote;

  useEffect(() => {
    if (!focused.current) setValue(remote);
  }, [remote]);

  return {
    value,
    setValue,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      setValue(latestRemote.current);
    },
  };
}

interface Props {
  note: FacilitatorNote;
  onChange: (field: NoteField, value: string) => void;
}

function NoteFields({ note, onChange }: Props) {
  const notes = useSyncedValue(note.notes);

  return (
    <div className="stack note-fields">
      <FormField>
        <FormFieldLabel>{t.notes.discussion}</FormFieldLabel>
        <Textarea
          placeholder={t.notes.placeholder}
          value={notes.value}
          onFocus={notes.onFocus}
          onBlur={notes.onBlur}
          onChange={(e) => {
            notes.setValue(e.target.value);
            onChange('notes', e.target.value);
          }}
          rows={5}
          maxLength={5000}
        />
      </FormField>
    </div>
  );
}

export default NoteFields;
