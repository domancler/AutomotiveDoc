/**
 * Minimal Vite env typings.
 * (Keeps the project compiling even if Vite's own client typings are not installed)
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
