const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

export const env = {
  apiUrl: rawApiUrl && rawApiUrl.length > 0 ? rawApiUrl : '/api',
  appName: 'Trampo Flow',
} as const;
