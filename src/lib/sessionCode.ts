/**
 * Six-letter words easy to share out loud between English and French speakers:
 * common, and spelled the same in both languages, accents aside (CINEMA, TENNIS, PIRATE).
 */
export const CODE_WORDS = [
  'ANIMAL', 'ARCADE', 'AVENUE', 'BALLET', 'BAOBAB', 'BASKET', 'BONSAI', 'BRONZE', 'BUFFET',
  'BUREAU', 'BURGER', 'CACTUS', 'CAMERA', 'CAMPUS', 'CANYON', 'CHALET', 'CHANCE', 'CINEMA',
  'COOKIE', 'COSMOS', 'COYOTE', 'CRAYON', 'DESERT', 'DESIGN', 'DETAIL', 'DIESEL', 'DOLLAR',
  'DOMINO', 'DRAGON', 'DUPLEX', 'ECLAIR', 'FACADE', 'FIESTA', 'FUSION', 'GADGET', 'GARAGE',
  'GLOBAL', 'HANGAR', 'HOCKEY', 'INDIGO', 'JAGUAR', 'JASMIN', 'JOCKEY', 'JUNGLE', 'KARATE',
  'LOTION', 'MARINE', 'MIRAGE', 'MOUSSE', 'MUSCLE', 'NATURE', 'NECTAR', 'NICKEL', 'OCTAVE',
  'ORANGE', 'PALACE', 'PARADE', 'PASTEL', 'PIGEON', 'PIRATE', 'PLASMA', 'PODIUM', 'POLLEN',
  'POSTER', 'POTION', 'PRINCE', 'PUZZLE', 'RAISIN', 'RECORD', 'REFUGE', 'SAFARI', 'SECRET',
  'SIGNAL', 'SLALOM', 'SORBET', 'SPRINT', 'STATUE', 'STEREO', 'STUDIO', 'TALENT', 'TANDEM',
  'TEMPLE', 'TENNIS', 'TICKET', 'TOUCAN', 'TRIBAL', 'TRIPLE', 'TUNNEL', 'UNIQUE', 'VELCRO',
  'VIKING', 'VIOLET', 'VISION', 'VOLUME', 'VOYAGE', 'ZIGZAG', 'ZOMBIE',
];
const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Same pattern is enforced in database.rules.json.
 * Also accepts the older random codes (letters and digits 2-9).
 */
export const CODE_PATTERN = /^[A-Z2-9]{6}$/;

/**
 * Sessions are deleted a semester after creation, which frees their word for a new session.
 * Same duration is enforced in database.rules.json (183 days in ms).
 */
export const SESSION_LIFETIME_MS = 183 * 24 * 60 * 60 * 1000;

export function isExpired(createdAt: number, now = Date.now()): boolean {
  return now - createdAt > SESSION_LIFETIME_MS;
}

function randomString(alphabet: string, length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function generateSessionCode(): string {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return CODE_WORDS[n % CODE_WORDS.length];
}

/** Random (not time-ordered) key so vote order can't be matched to voter order. */
export function randomKey(): string {
  return randomString(KEY_ALPHABET, 20);
}
