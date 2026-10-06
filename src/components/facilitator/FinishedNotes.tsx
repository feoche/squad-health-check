import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { summaryIndexes } from '../../lib/deriveClientState';
import { t } from '../../lib/i18n';
import { localizeCategory } from '../../lib/localizeCategory';
import { findPrevious, SessionExport } from '../../lib/sessionHistory';
import NoteFields, { EMPTY_NOTE } from '../NoteFields';
import VoteSummary from '../VoteSummary';
import PreviousResult from './PreviousResult';

interface Props {
  session: ClientSessionState;
  /** The imported previous session, compared with per category */
  previous: SessionExport | null;
  onChangeNote: (categoryIndex: number, value: string) => void;
}

/** Every category's note stays editable once finished, before exporting the report. */
function FinishedNotes({ session, previous, onChangeNote }: Props) {
  return (
    <Card className="card-body finished-notes">
      <Text preset={TEXT_PRESET.heading3}>{t.facilitator.allNotes}</Text>
      {summaryIndexes(session).map((i) => {
        const before = findPrevious(previous, session.categories[i]);
        return (
          <div key={i} className="stack finished-notes__item">
            <div className="inline wrap finished-notes__heading">
              <Text preset={TEXT_PRESET.heading5}>
                {i + 1}. {localizeCategory(session.categories[i]).title}
                {session.categoryResults[i] && ` (${t.votes(session.categoryResults[i].length)})`}
              </Text>
              {session.categoryResults[i] ? (
                <VoteSummary votes={session.categoryResults[i]} />
              ) : (
                <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
              )}
              {before && <PreviousResult previous={before} votes={session.categoryResults[i]} />}
            </div>
            <NoteFields
              note={session.facilitatorNotes[i] ?? EMPTY_NOTE}
              hideLabel
              onChange={(_field, value) => onChangeNote(i, value)}
            />
          </div>
        );
      })}
    </Card>
  );
}

export default FinishedNotes;
