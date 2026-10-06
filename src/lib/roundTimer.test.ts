import { describe, it, expect } from 'vitest';
import {
  formatElapsed,
  isFarOverSlot,
  formatHoursMinutes,
  formatMinutesSeconds,
  isOverSlot,
  secondsPerVoter,
  workshopMinutes,
} from './roundTimer';

describe('formatElapsed', () => {
  it('shows minutes and zero-padded seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7_000)).toBe('0:07');
    expect(formatElapsed(462_000)).toBe('7:42');
    expect(formatElapsed(59 * 60_000 + 59_000)).toBe('59:59');
  });

  it('drops the milliseconds', () => {
    expect(formatElapsed(61_999)).toBe('1:01');
  });

  it('adds hours past one hour', () => {
    expect(formatElapsed(3_600_000)).toBe('1:00:00');
    expect(formatElapsed(3_600_000 + 5 * 60_000 + 3_000)).toBe('1:05:03');
  });

  it('never goes below zero (clock skew right after the start)', () => {
    expect(formatElapsed(-1_500)).toBe('0:00');
  });
});

describe('isOverSlot', () => {
  it('turns true only once the slot is exceeded', () => {
    expect(isOverSlot(10 * 60_000 - 1, 10)).toBe(false);
    expect(isOverSlot(10 * 60_000, 10)).toBe(false);
    expect(isOverSlot(10 * 60_000 + 1, 10)).toBe(true);
  });
});

describe('isFarOverSlot', () => {
  it('turns true once 150% of the slot is reached', () => {
    expect(isFarOverSlot(15 * 60_000 - 1, 10)).toBe(false);
    expect(isFarOverSlot(15 * 60_000, 10)).toBe(true);
    expect(isFarOverSlot(3 * 60_000, 2)).toBe(true);
  });
});

describe('secondsPerVoter', () => {
  it('splits the time per category between the squad voters', () => {
    expect(secondsPerVoter(10)).toBe(75);
    expect(secondsPerVoter(20)).toBe(150);
  });

  it('rounds to 5 seconds', () => {
    expect(secondsPerVoter(7)).toBe(55);
    expect(secondsPerVoter(1)).toBe(10);
  });
});

describe('formatMinutesSeconds', () => {
  it('uses seconds under a minute', () => {
    expect(formatMinutesSeconds(40)).toBe('40 s');
  });

  it('uses minutes, with seconds when not round', () => {
    expect(formatMinutesSeconds(120)).toBe('2 min');
    expect(formatMinutesSeconds(75)).toBe('1 min 15');
    expect(formatMinutesSeconds(65)).toBe('1 min 05');
  });
});

describe('formatHoursMinutes', () => {
  it('uses minutes under an hour, hours with minutes when not round', () => {
    expect(formatHoursMinutes(45)).toBe('45 min');
    expect(formatHoursMinutes(120)).toBe('2h');
    expect(formatHoursMinutes(100)).toBe('1h40');
    expect(formatHoursMinutes(65)).toBe('1h05');
  });
});

describe('workshopMinutes', () => {
  it('fits 10 categories of 10 min into 2 hours, intro and wrap-up included', () => {
    expect(workshopMinutes(10, 10)).toBe(120);
  });

  it('scales with the number of categories and the time per category', () => {
    expect(workshopMinutes(15, 10)).toBe(170);
    expect(workshopMinutes(5, 15)).toBe(95);
  });
});
