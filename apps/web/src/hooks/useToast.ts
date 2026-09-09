import { useState, useCallback, useRef, useEffect } from 'react';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast(duration = 3000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Limpiar timeouts al desmontar
  useEffect(() => {
    const currentTimeouts = timeoutsRef.current;
    return () => {
      currentTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const showToast = useCallback(
    (message: string, type: Toast['type'] = 'success') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);

      const timeout = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutsRef.current.delete(id);
      }, duration);

      timeoutsRef.current.set(id, timeout);
    },
    [duration]
  );

  const removeToast = useCallback((id: number) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
