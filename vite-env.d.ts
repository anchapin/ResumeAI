/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly RESUMEAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace Vi {
    interface Matchers<R = any> {
      toHaveNoViolations(): R;
    }
  }
}

export {};
