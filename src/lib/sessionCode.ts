const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Same pattern is enforced in database.rules.json. */
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function randomString(alphabet: string, length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function generateSessionCode(): string {
  return randomString(CODE_ALPHABET, 6);
}

/** Random (not time-ordered) key so vote order can't be matched to voter order. */
export function randomKey(): string {
  return randomString(KEY_ALPHABET, 20);
}
