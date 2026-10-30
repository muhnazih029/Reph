/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Bearer token for the self-hosted API (empty in local dev). */
  readonly VITE_REPH_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
