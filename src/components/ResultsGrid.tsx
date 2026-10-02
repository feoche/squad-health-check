import {
  Button,
  Card,
  Icon,
  ICON_NAME,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Vote } from '../types';
import VoteMatrix from './VoteMatrix';

interface Props {
  votes: Vote[];
  isFacilitator: boolean;
  isLastCategory: boolean;
  onNextCategory: () => void;
  onEndSession: () => void;
}

function ResultsGrid({
  votes,
  isFacilitator,
  isLastCategory,
  onNextCategory,
  onEndSession,
}: Props) {
  const total = votes.length;

  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.heading3}>Results ({total} votes)</Text>

      <div className="table-scroll">
        <VoteMatrix votes={votes} />
      </div>

      {isFacilitator && (
        <div className="actions">
          {!isLastCategory ? (
            <Button onClick={onNextCategory}>
              Next Category
              <Icon name={ICON_NAME.arrowRight} />
            </Button>
          ) : (
            <Button onClick={onEndSession}>
              Finish Session
              <Icon name={ICON_NAME.check} />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default ResultsGrid;
