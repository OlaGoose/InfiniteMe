'use client';

import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      iconColor: 'text-green-600',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      iconColor: 'text-red-600',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      iconColor: 'text-amber-600',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    },
    info: {
      bg: 'bg-warm-100',
      border: 'border-warm-300',
      text: 'text-primary',
      iconColor: 'text-primary',
      icon: <Info className="w-5 h-5 text-primary" />,
    },
  };

  const style = styles[type];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto animate-in slide-in-from-top-2 fade-in duration-300">
      <div
        className={`${style.bg} ${style.border} border rounded-warm-lg shadow-warm-md backdrop-blur-sm px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        {style.icon}
        <p className={`flex-1 text-sm font-medium ${style.text}`}>{message}</p>
        <button
          onClick={onClose}
          className={`${style.iconColor} hover:opacity-70 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
