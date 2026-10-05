/** Returns a copy of `list` with the item at `from` moved to `to`; the same list if nothing moves */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const inRange = (i: number) => i >= 0 && i < list.length;
  if (from === to || !inRange(from) || !inRange(to)) return list;
  const updated = [...list];
  const [item] = updated.splice(from, 1);
  updated.splice(to, 0, item);
  return updated;
}
