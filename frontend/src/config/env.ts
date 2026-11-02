const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const rawAppName = import.meta.env.VITE_APP_NAME?.trim();

function normalizeBaseUrl(value: string | undefined): string {
  const withoutTrailingSlash = value?.replace(/\/+$/, '') ?? '';

  return withoutTrailingSlash.length > 0 ? withoutTrailingSlash : '/api';
}

export const env = {
  apiUrl: normalizeBaseUrl(rawApiUrl),
  appName: rawAppName && rawAppName.length > 0 ? rawAppName : 'Trampo Flow',
} as const;
