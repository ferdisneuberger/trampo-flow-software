export const APPLICATION_DELETE_MODES = ['soft', 'hard'] as const;

export type ApplicationDeleteMode = (typeof APPLICATION_DELETE_MODES)[number];

export function isApplicationDeleteMode(
  value: unknown,
): value is ApplicationDeleteMode {
  return (
    typeof value === 'string' &&
    APPLICATION_DELETE_MODES.includes(value as ApplicationDeleteMode)
  );
}
