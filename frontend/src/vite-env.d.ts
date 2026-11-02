/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_MAX_FILE_SIZE_MB?: string;
  readonly VITE_MAX_FILES_PER_APPLICATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
