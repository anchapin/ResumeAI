import { AxeResults } from 'axe-core';

declare global {
  namespace Vi {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

export {};
