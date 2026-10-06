import { Button, BUTTON_VARIANT, Card, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { downloadJSON, downloadMarkdown } from '../../lib/exportReport';
import { downloadPDF } from '../../lib/pdfReport';
import { SessionExport } from '../../lib/sessionHistory';
import PreviousSessionPicker from '../PreviousSessionPicker';
import { t } from '../../lib/i18n';

const warn = (err: unknown) => console.warn('[export]', err);

interface Props {
  session: ClientSessionState;
  /** The imported previous session, compared with on the recap */
  previous: SessionExport | null;
  onImport: (previous: SessionExport) => void;
  onRemove: () => void;
}

/** Downloads of the finished session's report, and the import of the previous one to compare with. */
function ReportExports({ session, previous, onImport, onRemove }: Props) {
  return (
    <Card className="card-body report-exports">
      <Button onClick={() => downloadMarkdown(session)}>
        <Icon name={ICON_NAME.download} />
        {t.notes.downloadMarkdown}
      </Button>
      <Button variant={BUTTON_VARIANT.outline} onClick={() => downloadPDF(session).catch(warn)}>
        <Icon name={ICON_NAME.download} />
        {t.notes.downloadPdf}
      </Button>
      <Button variant={BUTTON_VARIANT.outline} onClick={() => downloadJSON(session)}>
        <Icon name={ICON_NAME.download} />
        {t.notes.downloadJson}
      </Button>

      <PreviousSessionPicker previous={previous} onImport={onImport} onRemove={onRemove} />
    </Card>
  );
}

export default ReportExports;
