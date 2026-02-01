/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
