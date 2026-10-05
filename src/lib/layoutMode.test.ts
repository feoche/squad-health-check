import { describe, expect, it } from 'vitest';
import {
  FULL_LAYOUT_MIN_WIDTH,
  LAYOUT_KEY,
  initialLayout,
  readStoredLayout,
  storeLayout,
} from './layoutMode';

function memoryStorage() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

const blocked = (): never => {
  throw new Error('SecurityError: storage is disabled');
};

describe('initialLayout', () => {
  it('uses a stored choice whatever the width', () => {
    expect(initialLayout('compact', 1600)).toBe('compact');
    expect(initialLayout('full', 320)).toBe('full');
  });

  it('defaults to full on wide windows and compact on narrow ones', () => {
    expect(initialLayout(null, FULL_LAYOUT_MIN_WIDTH)).toBe('full');
    expect(initialLayout(null, FULL_LAYOUT_MIN_WIDTH - 1)).toBe('compact');
  });

  it('ignores unknown stored values', () => {
    expect(initialLayout('grid', 1200)).toBe('full');
  });
});

describe('stored layout', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    storeLayout(() => storage, 'compact');
    expect(storage.data[LAYOUT_KEY]).toBe('compact');
    expect(readStoredLayout(() => storage)).toBe('compact');
  });

  it('reads nothing and does not throw when storage is blocked', () => {
    expect(readStoredLayout(blocked)).toBeNull();
    expect(() => storeLayout(blocked, 'full')).not.toThrow();
  });
});
