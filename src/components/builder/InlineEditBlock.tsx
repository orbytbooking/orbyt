'use client';

import { Pencil, EyeOff } from 'lucide-react';
import type { EditableTextHandle } from './EditableText';

interface InlineEditBlockProps {
  children: React.ReactNode;
  editRef: React.RefObject<EditableTextHandle | null>;
  onHide?: () => void;
  /** Optional label shown in toolbar (e.g. "Heading") */
  label?: string;
  /** Inline vs block: block adds full-width wrapper for toolbar positioning */
  inline?: boolean;
}

/**
 * Wraps an editable text block in the visual builder. On hover: light blue border
 * and floating toolbar with Edit and Hide (like reference builders).
 */
export function InlineEditBlock({
  children,
  editRef,
  onHide,
  label,
  inline = false,
}: InlineEditBlockProps) {
  return (
    <div
      className={`group/inline-edit relative pt-10 -mt-10 ${inline ? 'inline-block' : 'block'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-md border-2 border-transparent group-hover/inline-edit:border-[#1a73e8] transition-colors min-w-0">
        {children}
      </div>
      <div className="absolute left-0 top-0 z-50 flex items-center gap-0.5 opacity-0 group-hover/inline-edit:opacity-100 transition-opacity pointer-events-none group-hover/inline-edit:pointer-events-auto">
        <div className="flex items-center bg-white border border-[#dadce0] rounded-md shadow-md py-1 px-1.5 text-[#202124]">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#e8eaed] text-xs font-medium"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editRef.current?.focus();
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-[#5f6368]" />
            Edit
          </button>
          {onHide && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#e8eaed] text-xs font-medium text-[#5f6368]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onHide();
              }}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide
            </button>
          )}
        </div>
        {label && (
          <span className="ml-1.5 px-1.5 py-0.5 bg-[#e8eaed] text-[#5f6368] text-xs rounded font-mono">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
