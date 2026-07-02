import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional classes for the panel (e.g. max-w-3xl, max-h-[85vh]) */
  panelClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, panelClassName }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'orbyt-admin-modal relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[75vh] overflow-y-auto',
          panelClassName
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-cyan-500/20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-300" />
          </button>
        </div>
        
        {/* Content — slightly tighter bottom padding */}
        <div className="px-6 pt-6 pb-4 dark:[&_label]:text-white">
          {children}
        </div>
      </div>
    </div>
  );
}
