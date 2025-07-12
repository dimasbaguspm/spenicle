// global type definitions for vite environment variables
/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_VERSION: string;
    readonly VITE_BUILD_TIME: string;
    readonly VITE_PACKAGE_VERSION: string;
  }
}

export {};
