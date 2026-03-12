import React from 'react';
import { ToastComponentProps, ToastAction } from '../types/toast';

const ActionableToast: React.FC<
  ToastComponentProps<{
    message: string;
    actions: ToastAction[];
  }>
> = ({ toastProps, message, actions }) => {
  // `toastProps` contains properties from react-toastify, like `closeToast`
  const { closeToast } = toastProps;

  return (
    <div className="p-4 rounded-lg shadow-lg bg-white border border-gray-200">
      <p className="text-sm text-gray-800 mb-3">{message}</p>
      <div className="flex gap-3 justify-end">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick();
              closeToast?.(); // Optional: close toast on action click
            }}
            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
              action.className || 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={closeToast}
          className="px-3 py-1 rounded text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ActionableToast;
