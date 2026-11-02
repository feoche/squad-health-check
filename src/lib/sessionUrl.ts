// Always share the published app, even from a local dev server, so the link
// and QR code work for participants on other devices.
const PUBLIC_APP_URL = 'https://feoche.github.io/squad-health-check/';

export function sessionUrl(code: string): string {
  return `${PUBLIC_APP_URL}#/session/${code}`;
}
