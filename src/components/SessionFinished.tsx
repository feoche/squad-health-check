import { Badge, Card, Icon, Table, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import { countColors, countTrends } from '../lib/exportReport';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
import OpenNotesButton from './OpenNotesButton';

interface Props {
  session: ClientSessionState;
}

/** Shared recap: votes only — notes, takeaways and exports live in the facilitator notes window. */
function SessionFinished({ session }: Props) {
  return (
    <div className="page">
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading2}>Session Complete!</Text>
        <Text preset={TEXT_PRESET.paragraph}>
          Here&apos;s the summary of all results from the health check.
        </Text>
      </div>

      <Card className="card-body table-scroll">
        <Table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Category</th>
              {COLOR_OPTIONS.map(({ value, label, badge }) => (
                <th scope="col" key={value}>
                  <Badge color={badge}>{label}</Badge>
                </th>
              ))}
              {TREND_OPTIONS.map(({ value, label, icon }) => (
                <th scope="col" key={value}>
                  <Icon name={icon} aria-label={label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.allResults.map((result) => {
              const cat = session.categories[result.categoryIndex];
              const cc = countColors(result.votes);
              const tc = countTrends(result.votes);
              return (
                <tr key={result.categoryIndex}>
                  <td>{result.categoryIndex + 1}</td>
                  <th scope="row">{cat.name}</th>
                  <td>{cc.green}</td>
                  <td>{cc.orange}</td>
                  <td>{cc.red}</td>
                  <td>{tc.up}</td>
                  <td>{tc.stable}</td>
                  <td>{tc.down}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {session.isFacilitator && (
        <div className="stack stack-center">
          <Text preset={TEXT_PRESET.paragraph}>
            Notes, takeaways and downloads are in your facilitator notes.
          </Text>
          <OpenNotesButton code={session.code} />
        </div>
      )}
    </div>
  );
}

export default SessionFinished;
