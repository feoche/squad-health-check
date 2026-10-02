import { useEffect, useRef, useState } from 'react';
import { FormField, FormFieldLabel, Input, Textarea } from '@ovhcloud/ods-react';
import { FacilitatorNote } from '../types';
import { NoteField } from '../lib/sessionStore';

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
  const takeaway = useSyncedValue(note.takeaway);

  return (
    <div className="stack">
      <FormField>
        <FormFieldLabel>Discussion notes</FormFieldLabel>
        <Textarea
          placeholder="Write down key discussion points…"
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
      <FormField>
        <FormFieldLabel>Takeaway</FormFieldLabel>
        <Input
          placeholder="One-line conclusion…"
          value={takeaway.value}
          onFocus={takeaway.onFocus}
          onBlur={takeaway.onBlur}
          onChange={(e) => {
            takeaway.setValue(e.target.value);
            onChange('takeaway', e.target.value);
          }}
          maxLength={300}
        />
      </FormField>
    </div>
  );
}

export default NoteFields;
