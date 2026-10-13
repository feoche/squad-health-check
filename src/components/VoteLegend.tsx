import { Category, VoteMode } from '../types';
import ColorCards from './ColorCards';
import ScaleCards from './ScaleCards';

/** What the votes mean: the three health colours, or the two ends of the 1–9 scale */
function VoteLegend({ mode, category, large = false }: { mode: VoteMode; category?: Category; large?: boolean }) {
  return mode === 'range' ? (
    <ScaleCards category={category} large={large} />
  ) : (
    <ColorCards category={category} large={large} />
  );
}

export default VoteLegend;
