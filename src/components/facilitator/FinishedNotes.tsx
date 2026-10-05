import { Button, BUTTON_VARIANT, Card, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { summaryIndexes } from '../../lib/deriveClientState';
import { downloadMarkdown, downloadPDF } from '../../lib/exportReport';
import { t } from '../../lib/i18n';
import { localizeCategory } from '../../lib/localizeCategory';
import NoteFields, { EMPTY_NOTE } from '../NoteFields';
import VoteSummary from '../VoteSummary';

const warn = (err: unknown) => console.warn('[export]', err);

interface Props {
  session: ClientSessionState;
  onChangeNote: (categoryIndex: number, value: string) => void;
}

/** Every category's note stays editable once finished, before exporting the report. */
function FinishedNotes({ session, onChangeNote }: Props) {
  return (
    <>
      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading3}>{t.facilitator.allNotes}</Text>
        {summaryIndexes(session).map((i) => (
          <div key={i} className="stack summary-item">
            <Text preset={TEXT_PRESET.heading5}>
              {i + 1}. {localizeCategory(session.categories[i]).title}
            </Text>
            {session.categoryResults[i] ? (
              <VoteSummary votes={session.categoryResults[i]} />
            ) : (
              <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
            )}
            <NoteFields
              note={session.facilitatorNotes[i] ?? EMPTY_NOTE}
              onChange={(_field, value) => onChangeNote(i, value)}
            />
          </div>
        ))}
      </Card>

      <div className="actions">
        <Button onClick={() => downloadMarkdown(session)}>
          <Icon name={ICON_NAME.download} />
          {t.notes.downloadMarkdown}
        </Button>
        <Button variant={BUTTON_VARIANT.outline} onClick={() => downloadPDF(session).catch(warn)}>
          <Icon name={ICON_NAME.download} />
          {t.notes.downloadPdf}
        </Button>
      </div>
    </>
  );
}

export default FinishedNotes;
