import { useEffect, useState } from 'react';

interface ServerInfo {
  ip: string;
  frontendPort: number;
  backendPort: number;
}

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

/**
 * Fetches the server's LAN IP so share URLs always show the network
 * address, even when the facilitator opened via localhost.
 */
export function useNetworkOrigin(): string {
  const [origin, setOrigin] = useState(window.location.origin);

  useEffect(() => {
    fetch(`${SOCKET_URL}/api/info`)
      .then((r) => r.json())
      .then((info: ServerInfo) => {
        const proto = window.location.protocol;
        setOrigin(`${proto}//${info.ip}:${info.frontendPort}`);
      })
      .catch(() => {
        /* keep window.location.origin as fallback */
      });
  }, []);

  return origin;
}

