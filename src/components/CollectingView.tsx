import { useEffect, useRef, useState } from 'react';
import {
  Button,
  BUTTON_VARIANT,
  Icon,
  ICON_NAME,
  Message,
  MessageBody,
  MessageIcon,
  MESSAGE_COLOR,
  ProgressBar,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, Vote } from '../types';
import VotingPanel from './VotingPanel';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';
import { voteText } from '../lib/voteText';
import { isRangeVote } from '../lib/voteScore';
import ColorBadge from './ColorBadge';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (vote: Vote, index: number) => void | Promise<boolean>;
}

/**
 * An async session's voting window: one category at a time, then a review of every answer.
 * Each vote is saved as it is given, so leaving halfway keeps the progress.
 */
function CollectingView({ session, onSubmitVote }: Props) {
  const { categories, myVotes, myVotedIndexes, voteMode } = session;
  /* The last step, one past the categories, is the review */
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState('');
  /* Why the last save failed: a write refused once the meeting started means voting is closed */
  const [failed, setFailed] = useState<'generic' | 'closed' | null>(null);
  /* A second submit before the first write resolves would count as a new vote: ignore it */
  const saving = useRef(false);
  /* The save resolves after the render that started it, so the phase is read from a ref */
  const phase = useRef(session.phase);
  const heading = useRef<HTMLDivElement>(null);
  const lastStep = useRef(step);
  const total = categories.length;
  const isReview = step >= total;

  useEffect(() => {
    phase.current = session.phase;
  }, [session.phase]);

  /* The step replaces the control that had the focus: bring it to the new step's title */
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    setFailed(null);
    heading.current?.focus();
  }, [step]);

  const progress = (
    <div className="stack collecting-view__progress">
      <Text preset={TEXT_PRESET.caption}>{t.collecting.answered(myVotedIndexes.length, total)}</Text>
      <ProgressBar value={myVotedIndexes.length} max={total} aria-label={t.collecting.progress} />
    </div>
  );

  /* Success is announced here; a failure is shown as an alert instead (see below) */
  const status = (
    <div role="status" className="visually-hidden">
      {saved}
    </div>
  );

  if (isReview) {
    const missing = total - myVotedIndexes.length;
    return (
      <div className="stack collecting-view collecting-view--review">
        {progress}
        <div ref={heading} tabIndex={-1} className="collecting-view__heading">
          <Text preset={TEXT_PRESET.heading2} as="h3">{t.collecting.reviewTitle}</Text>
        </div>
        <Text preset={TEXT_PRESET.paragraph}>
          {missing > 0 ? t.collecting.missing(missing) : t.collecting.allDone}
        </Text>
        <ul className="stack collecting-view__answers">
          {categories.map((category, i) => {
            const { title } = localizeCategory(category);
            const vote = myVotes[i];
            const answered = myVotedIndexes.includes(i);
            return (
              <li key={i} className="inline wrap collecting-view__answer">
                <Text preset={TEXT_PRESET.label}>{title}</Text>
                <Text preset={TEXT_PRESET.paragraph}>
                  {answered && vote && !isRangeVote(vote) ? (
                    <>
                      <ColorBadge color={vote.color} />, {t.trends[vote.trend]}
                    </>
                  ) : answered ? (
                    vote ? voteText(vote) : t.collecting.loadingAnswer
                  ) : (
                    t.collecting.notAnswered
                  )}
                </Text>
                <Button variant={BUTTON_VARIANT.ghost} onClick={() => setStep(i)}>
                  <Icon name={answered ? ICON_NAME.pen : ICON_NAME.arrowRight} />
                  {answered ? t.collecting.edit : t.collecting.answer}
                  <span className="visually-hidden"> {title}</span>
                </Button>
              </li>
            );
          })}
        </ul>
        {status}
      </div>
    );
  }

  const category = categories[step];
  const { title, subtitle } = localizeCategory(category);
  const answered = myVotedIndexes.includes(step);
  const loading = answered && myVotes[step] === undefined;

  return (
    <div className="stack collecting-view">
      {progress}
      <div ref={heading} tabIndex={-1} className="collecting-view__heading">
        <Text preset={TEXT_PRESET.heading2} as="h3">{title}</Text>
        <Text preset={TEXT_PRESET.caption}>{t.categoryPosition(step + 1, total)}</Text>
        {subtitle && <Text>{subtitle}</Text>}
      </div>
      {loading ? (
        <Text preset={TEXT_PRESET.caption}>{t.collecting.loadingAnswer}</Text>
      ) : (
        <VotingPanel
          key={step}
          category={category}
          voteMode={voteMode}
          initialVote={myVotes[step] ?? null}
          submitLabel={t.collecting.saveAndNext}
          onSubmitVote={async (vote) => {
            if (saving.current) return;
            saving.current = true;
            setFailed(null);
            try {
              let saveSucceeded = false;
              try {
                saveSucceeded = Boolean(await onSubmitVote(vote, step));
              } catch {
                /* A throw counts as a failed save, shown like a refused one */
              }
              if (saveSucceeded) {
                setSaved(t.collecting.saved(title));
                setStep(step + 1);
              } else {
                /* Stay on this step: the answer was not saved */
                setFailed(phase.current === 'collecting' ? 'generic' : 'closed');
              }
            } finally {
              saving.current = false;
            }
          }}
        />
      )}
      {failed && (
        <Message color={MESSAGE_COLOR.critical} dismissible={false} role="alert">
          <MessageIcon name={ICON_NAME.hexagonExclamation} />
          <MessageBody>{failed === 'closed' ? t.collecting.closed : t.errors.generic}</MessageBody>
        </Message>
      )}
      <div className="actions collecting-view__nav">
        {step > 0 && (
          <Button variant={BUTTON_VARIANT.outline} onClick={() => setStep(step - 1)}>
            <Icon name={ICON_NAME.arrowLeft} />
            {t.collecting.previous}
          </Button>
        )}
        <Button variant={BUTTON_VARIANT.ghost} onClick={() => setStep(step + 1)}>
          {answered ? t.collecting.next : t.collecting.skip}
          <Icon name={ICON_NAME.arrowRight} />
        </Button>
      </div>
      {status}
    </div>
  );
}

export default CollectingView;
