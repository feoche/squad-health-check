/** Sessions that can be active at once. Enforced in database.rules.json by slots 0–9. */
export const MAX_LIVE_SESSIONS = 10;

/** A session keeps its slot at most this long. Same duration is enforced in database.rules.json. */
export const LIVE_SLOT_LEASE_MS = 12 * 60 * 60 * 1000;

/**
 * `/liveSlots` as Firebase returns it: an object, or an array with null holes when the keys
 * are consecutive from 0. Indexing by string works for both.
 */
export type LiveSlots = Record<string, { code?: string } | null> | null;

/** What the rules read on the session holding a slot */
export interface LiveHolder {
  phase?: string;
  createdAt: number;
}

/**
 * Free slot numbers, in order. Mirrors the rules: a slot is free when it is empty, when its
 * holder is missing or finished, or when the holder was created more than the lease ago.
 * `holders` is by session code; a missing session is undefined.
 */
export function freeLiveSlots(
  slots: LiveSlots,
  holders: Record<string, LiveHolder | undefined>,
  now: number,
): number[] {
  return Array.from({ length: MAX_LIVE_SESSIONS }, (_, i) => i).filter((i) => {
    const code = slots?.[String(i)]?.code;
    if (!code) return true;
    const holder = holders[code];
    if (!holder || holder.phase === 'finished') return true;
    return holder.createdAt < now - LIVE_SLOT_LEASE_MS;
  });
}
