/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by the deploy workflow from GitVersion's FullSemVer. */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
