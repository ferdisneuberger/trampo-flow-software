const ALLOWED_EXTENSIONS = ['pdf', 'txt'] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export function extensionFromName(name: string): AllowedExtension | null {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  const extension = match?.[1]?.toLowerCase();

  if (!extension) {
    return null;
  }

  return (ALLOWED_EXTENSIONS as readonly string[]).includes(extension)
    ? (extension as AllowedExtension)
    : null;
}

export function buildStorageKey(
  applicationId: string,
  fileId: string,
  extension: AllowedExtension,
): string {
  return `applications/${applicationId}/${fileId}.${extension}`;
}
