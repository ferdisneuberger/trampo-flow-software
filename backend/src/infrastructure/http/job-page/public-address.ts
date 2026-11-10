import { isIPv4, isIPv6 } from 'node:net';

/**
 * Diz se um IP é público na internet. Endereços internos (loopback, redes
 * privadas, link-local, metadados de nuvem, multicast e afins) ficam de fora
 * para que o servidor não possa ser usado para acessar a própria rede (SSRF).
 */
export function isPublicAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '');

  if (isIPv4(ip)) {
    return isPublicIPv4(ip);
  }

  if (isIPv6(ip)) {
    return isPublicIPv6(ip);
  }

  return false;
}

function isPublicIPv4(ip: string): boolean {
  const [a = 0, b = 0, c = 0] = ip.split('.').map(Number);

  if (a === 0) return false; // 0.0.0.0/8
  if (a === 10) return false; // privada
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT 100.64/10
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local e metadados de nuvem
  if (a === 172 && b >= 16 && b <= 31) return false; // privada
  if (a === 192 && b === 0 && c === 0) return false; // 192.0.0/24
  if (a === 192 && b === 0 && c === 2) return false; // documentação
  if (a === 192 && b === 168) return false; // privada
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmark
  if (a === 198 && b === 51 && c === 100) return false; // documentação
  if (a === 203 && b === 0 && c === 113) return false; // documentação
  if (a >= 224) return false; // multicast, reservada e broadcast

  return true;
}

function isPublicIPv6(ip: string): boolean {
  const groups = expandIPv6(ip);

  if (!groups) {
    return false;
  }

  const [first = 0] = groups;
  const isZeroPrefix = groups.slice(0, 5).every((group) => group === 0);

  // ::ffff:a.b.c.d (IPv4 mapeado) e ::a.b.c.d (IPv4 compatível)
  if (isZeroPrefix && (groups[5] === 0xffff || groups[5] === 0)) {
    const high = groups[6] ?? 0;
    const low = groups[7] ?? 0;

    if (groups[5] === 0 && high === 0) {
      return false; // :: e ::1
    }

    return isPublicIPv4(
      [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.'),
    );
  }

  if ((first & 0xfe00) === 0xfc00) return false; // fc00::/7 (ULA)
  if ((first & 0xffc0) === 0xfe80) return false; // fe80::/10 (link-local)
  if ((first & 0xff00) === 0xff00) return false; // ff00::/8 (multicast)
  if (first === 0x2001 && groups[1] === 0x0db8) return false; // documentação
  if (first === 0x64 && groups[1] === 0xff9b) return false; // NAT64

  return (first & 0xe000) === 0x2000; // só unicast global (2000::/3)
}

function expandIPv6(ip: string): number[] | null {
  let address = ip.split('%')[0] ?? '';
  const ipv4Tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(address);

  if (ipv4Tail?.[1]) {
    const [a = 0, b = 0, c = 0, d = 0] = ipv4Tail[1].split('.').map(Number);
    address = address.replace(
      ipv4Tail[1],
      `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`,
    );
  }

  const [head = '', tail] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const missing = 8 - headGroups.length - tailGroups.length;

  if (tail === undefined ? headGroups.length !== 8 : missing < 1) {
    return null;
  }

  const groups = [
    ...headGroups,
    ...Array<string>(tail === undefined ? 0 : missing).fill('0'),
    ...tailGroups,
  ].map((group) => Number.parseInt(group, 16));

  return groups.length === 8 &&
    groups.every((group) => group >= 0 && group <= 0xffff)
    ? groups
    : null;
}
