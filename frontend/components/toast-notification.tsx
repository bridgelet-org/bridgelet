'use client';

import { useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type ToastNotificationProps = {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. Set to 0 to disable. */
  duration?: number;
  onDismiss?: () => void;
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
};

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

export function ToastNotification({
  message,
  variant = 'info',
  duration = 5000,
  onDismiss,
}: ToastNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm ${VARIANT_STYLES[variant]}`}
    >
      <span className="mt-0.5 font-bold" aria-hidden="true">
        {ICONS[variant]}
      </span>
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        aria-label="Dismiss notification"
        className="text-current opacity-50 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
