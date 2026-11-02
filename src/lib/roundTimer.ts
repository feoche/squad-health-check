/* ─── Per-category time slot: the round timer turns to a warning colour past it, critical well past it ─── */

/** 10 categories × 10 min + intro and wrap-up ≈ 2 hours */
export const DEFAULT_CATEGORY_MINUTES = 10;
export const MIN_CATEGORY_MINUTES = 1;
/** Mirrored in database.rules.json */
export const MAX_CATEGORY_MINUTES = 30;

/** Intro plus wrap-up, on top of the categories */
const FRAMING_MINUTES = 20;
/** Voters per squad, assumed when the session is set up: people only join afterwards */
export const ASSUMED_VOTERS = 8;

const pad = (n: number) => String(n).padStart(2, '0');

/** m:ss, or h:mm:ss past one hour */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Share of the slot past which the round timer turns critical */
const CRITICAL_SLOT_RATIO = 1.5;

export function isOverSlot(elapsedMs: number, categoryMinutes: number): boolean {
  return elapsedMs > categoryMinutes * 60_000;
}

export function isFarOverSlot(elapsedMs: number, categoryMinutes: number): boolean {
  return elapsedMs >= categoryMinutes * 60_000 * CRITICAL_SLOT_RATIO;
}

/** Whole workshop, intro and wrap-up included */
export function workshopMinutes(categoryCount: number, categoryMinutes: number): number {
  return categoryCount * categoryMinutes + FRAMING_MINUTES;
}

/** "45 min", "2h", "1h40" */
export function formatHoursMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}
