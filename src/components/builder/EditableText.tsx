'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface EditableTextHandle {
  focus: () => void;
}

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  tag?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3';
  placeholder?: string;
  multiline?: boolean;
}

/**
 * Renders text that becomes contentEditable on click. On blur, saves via onSave.
 * Used in the visual page builder so users can click and edit text in place.
 * Exposes focus() via ref for floating toolbar "Edit" button.
 */
export const EditableText = forwardRef<EditableTextHandle, EditableTextProps>(function EditableText(
  {
    value,
    onSave,
    className = '',
    tag: Tag = 'span',
    placeholder = 'Click to edit',
    multiline = false,
  },
  ref
) {
  const innerRef = useRef<HTMLElement>(null);
  const lastValueRef = useRef(value);

  useImperativeHandle(ref, () => ({
    focus: () => innerRef.current?.focus(),
  }), []);

  const handleBlur = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const newValue = (el.textContent || '').trim();
    if (newValue !== lastValueRef.current) {
      lastValueRef.current = newValue;
      onSave(newValue);
    }
  }, [onSave]);

  // Sync from props when value changes externally (e.g. from sidebar) and we're not focused
  useEffect(() => {
    const el = innerRef.current;
    if (!el || document.activeElement === el) return;
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      el.textContent = value || '';
    }
  }, [value]);

  return (
    <Tag
      ref={innerRef as any}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-inset rounded px-0.5 -mx-0.5 cursor-text ${className}`}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) e.preventDefault();
      }}
      data-placeholder={placeholder}
      style={{ minHeight: multiline ? '2em' : undefined }}
    >
      {value || ''}
    </Tag>
  );
});
