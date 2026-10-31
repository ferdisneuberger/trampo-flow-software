export function getHostname(value: string): string {
  try {
    const url = new URL(value);

    return url.hostname.replace(/^www\./, '') || value;
  } catch {
    return value;
  }
}
