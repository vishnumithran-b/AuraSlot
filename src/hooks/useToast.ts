import { useState, useCallback } from 'react';
import type { ToastMessage } from '../types/appointment';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      title?: string,
      duration: number = 4000
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message: string, title: string = 'Success') => {
      return addToast(message, 'success', title);
    },
    [addToast]
  );

  const showError = useCallback(
    (message: string, title: string = 'Error') => {
      return addToast(message, 'error', title);
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message: string, title: string = 'Notice') => {
      return addToast(message, 'info', title);
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
  };
};
