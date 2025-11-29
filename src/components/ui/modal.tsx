import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalAction {
  label: string;
  variant?: 'primary' | 'outline' | 'destructive';
  onClick: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

interface ModalProps {
  open: boolean;
  title?: string;
  description?: string | ReactNode;
  onClose: () => void;
  actions?: ModalAction[];
  size?: 'md' | 'lg';
}

export function Modal({ open, title, description, onClose, actions = [], size = 'md' }: ModalProps) {
  if (!open) return null;
  const widthClass = size === 'lg' ? 'max-w-4xl' : 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className={`w-full ${widthClass} rounded-xl bg-white shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col`}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
            {title && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-auto text-2xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
            {description && typeof description === 'string' ? (
              <p className="text-sm text-gray-600 whitespace-pre-line">{description}</p>
            ) : (
              description
            )}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2 flex-shrink-0">
            {actions.length === 0 && (
              <Button size="sm" variant="primary" onClick={onClose}>
                OK
              </Button>
            )}
            {actions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant === 'destructive' ? 'destructive' : action.variant || 'primary'}
                onClick={action.onClick}
                isLoading={action.isLoading}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
