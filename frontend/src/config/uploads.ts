function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const MAX_FILE_SIZE_MB = positiveInt(
  import.meta.env.VITE_MAX_FILE_SIZE_MB,
  5,
);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_FILES_PER_APPLICATION = positiveInt(
  import.meta.env.VITE_MAX_FILES_PER_APPLICATION,
  3,
);
