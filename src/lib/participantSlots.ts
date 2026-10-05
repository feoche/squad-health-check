/** Hard cap per session, enforced in database.rules.json by write-once slots 0–14. */
export const MAX_PARTICIPANTS = 15;

/** Free slot indexes, shuffled so simultaneous joiners rarely race for the same one. */
export function freeSlots(taken: Record<string, unknown> | null): number[] {
  const free = Array.from({ length: MAX_PARTICIPANTS }, (_, i) => i).filter(
    (i) => !taken?.[String(i)],
  );
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free;
}
