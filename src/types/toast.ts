import { ToastOptions } from 'react-toastify';

export interface ToastAction {
  label: string;
  onClick: () => void;
  className?: string;
}

export interface ToastComponentProps<T = unknown> extends ToastOptions {
  toastProps: {
    closeToast: () => void;
    toastId: number | string;
    isIn: boolean;
    style: React.CSSProperties;
    props: T;
  };
  message: string;
  actions: ToastAction[];
}
