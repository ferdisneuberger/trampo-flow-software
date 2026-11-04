const CODE_LENGTH = 6;
const SEPARATOR_POSITION = 3;

export function formatVerificationCode(
  value: string,
  previousValue = '',
): string {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);

  if (cleaned.length > SEPARATOR_POSITION) {
    return `${cleaned.slice(0, SEPARATOR_POSITION)}-${cleaned.slice(
      SEPARATOR_POSITION,
    )}`;
  }

  if (
    cleaned.length === SEPARATOR_POSITION &&
    value.length > previousValue.length
  ) {
    return `${cleaned}-`;
  }

  return cleaned;
}

export function isVerificationCodeComplete(value: string): boolean {
  return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(value);
}
