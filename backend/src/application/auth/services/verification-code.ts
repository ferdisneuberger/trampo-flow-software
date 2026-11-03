export function normalizeVerificationCode(value: string): string | null {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '');

  if (/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^[A-Z0-9]{6}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }

  return null;
}
