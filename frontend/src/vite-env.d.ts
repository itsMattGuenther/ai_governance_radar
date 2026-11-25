/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" in the static public build (`vite build --mode static`, DEC-029). */
  readonly VITE_STATIC_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
