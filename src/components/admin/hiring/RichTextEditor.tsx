'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  TextStyle,
  Color,
  FontSize,
  FontFamily,
  BackgroundColor,
} from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  RemoveFormatting,
  Code,
  Undo2,
  Redo2,
  Minus,
  Plus,
} from 'lucide-react';

const FONT_FAMILIES = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New'];

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  defaultFontSize?: string;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Type here...',
  className,
  defaultFontSize = '16px',
}: RichTextEditorProps) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
      StarterKit.configure({
        heading: false,
      }),
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      BackgroundColor,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[80px] px-3 py-2 focus:outline-none rounded-b-md border border-t-0 border-input bg-background',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  },
  []
  );

  const [pendingColor, setPendingColor] = useState<string>('#000000');

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  const applyColor = useCallback(
    (color: string) => {
      if (!editor) return;
      const html = editor.getHTML();
      if (!html || html === '<p></p>') return;
      const withColor = html.replace(
        /<p>(.*?)<\/p>/gs,
        (_, inner) => `<p><span style="color: ${color}">${inner}</span></p>`
      );
      editor.commands.setContent(withColor, false);
      onChange?.(withColor);
    },
    [editor, onChange]
  );

  const currentSize = editor?.getAttributes('textStyle').fontSize || defaultFontSize;
  const sizeNum = parseInt(currentSize, 10) || 16;

  if (!editor) return null;

  return (
    <div className={cn('rounded-md border border-input bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/30 p-1 rounded-t-md">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', editor.isActive('bold') && 'bg-muted')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', editor.isActive('italic') && 'bg-muted')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', editor.isActive('underline') && 'bg-muted')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', editor.isActive('strike') && 'bg-muted')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-0.5" />
        <Select
          value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
          onValueChange={(v) => editor.chain().focus().setFontFamily(v).run()}
        >
          <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-7"
            onClick={() => editor.chain().focus().setFontSize(`${Math.max(8, sizeNum - 2)}px`).run()}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="text"
            value={currentSize}
            className="w-12 h-8 text-center text-xs"
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d+px?$/.test(v) || /^\d+$/.test(v)) {
                const px = v.replace(/px?$/, '') + 'px';
                editor.chain().focus().setFontSize(px).run();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-7"
            onClick={() => editor.chain().focus().setFontSize(`${Math.min(72, sizeNum + 2)}px`).run()}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-0.5">
          <input
            type="color"
            className="w-8 h-8 cursor-pointer rounded border border-input bg-transparent p-0"
            value={pendingColor}
            onChange={(e) => setPendingColor(e.target.value)}
            title="Text color"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setTimeout(() => applyColor(pendingColor), 0)}
          >
            Apply
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().setBackgroundColor('#fef08a').run()}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', editor.isActive('code') && 'bg-muted')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
      <div className="flex items-center justify-end gap-1 px-2 py-1 text-xs text-muted-foreground border-t border-input">
        <span>
          {editor.getText().trim()
            ? editor.getText().trim().split(/\s+/).filter(Boolean).length
            : 0}{' '}
          word(s)
        </span>
      </div>
    </div>
  );
}
