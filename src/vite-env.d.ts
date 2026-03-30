/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Web portal origin, e.g. https://portal.etapsky.com (billing link in Settings). */
  readonly VITE_PORTAL_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
