// ---- Minimal shims to keep TypeScript happy without external @types packages ----

// Node ESM shim used by vite.config.ts
declare const __dirname: string;

declare module "node:path" {
  export function resolve(...paths: string[]): string;
}
