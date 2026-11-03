import { describe, expect, it } from 'vitest';
import rules from '../../database.rules.json';
import { LIVE_SLOT_LEASE_MS, MAX_LIVE_SESSIONS } from './liveSessionSlots';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const root = rules.rules as Record<string, any>;
const slot = root.liveSlots?.$n;
const meta = root.sessions.$code.meta;

describe('live session cap in database.rules.json', () => {
  it('has as many slots as the app expects', () => {
    expect(slot['.write']).toContain(`/^[0-${MAX_LIVE_SESSIONS - 1}]$/`);
    expect(meta.liveSlot['.validate']).toContain(`newData.val() <= ${MAX_LIVE_SESSIONS - 1}`);
  });

  it('uses the same lease as the app', () => {
    expect(slot['.write']).toContain(`now - ${LIVE_SLOT_LEASE_MS}`);
  });

  it('takes a slot only together with the metadata of the new session', () => {
    expect(slot['.write']).toContain("/meta/facilitatorId').val() === auth.uid");
    expect(slot['.write']).toContain("/meta/liveSlot').val() + '' === $n");
    expect(meta['.write']).toContain("child('liveSlots/' + newData.child('liveSlot').val() + '/code').val() === $code");
  });

  it('frees a slot for a finished, deleted or expired holder', () => {
    const w: string = slot['.write'];
    expect(w).toContain("/state/phase').val() === 'finished'");
    expect(w).toContain("!root.child('sessions/' + data.child('code').val() + '/meta').exists()");
    expect(w).toContain("/meta/createdAt').val() < now");
  });

  it('requires the session metadata to name its slot and the server time', () => {
    expect(meta['.validate']).toContain("'liveSlot'");
    expect(meta.createdAt['.validate']).toBe('newData.val() === now');
  });
});
