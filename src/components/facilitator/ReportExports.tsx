import { Button, BUTTON_VARIANT, Card, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { downloadMarkdown, downloadPDF } from '../../lib/exportReport';
import { t } from '../../lib/i18n';

const warn = (err: unknown) => console.warn('[export]', err);

/** Downloads of the finished session's report. */
function ReportExports({ session }: { session: ClientSessionState }) {
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
    </Card>
  );
}

export default ReportExports;
