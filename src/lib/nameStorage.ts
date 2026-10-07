/** The name typed on the last join, offered again on the next session */
const NAME_STORAGE_KEY = 'participantName';

/* Storage may be missing or blocked: then the name is typed again on each join */
export function loadStoredName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveStoredName(name: string) {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    /* Storage blocked */
  }
}
