"use client";

import { useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared rich editor for Form 1 popup HTML (service category, pricing variables). */
export function Form1RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value || "";
  }, [value]);
  const execCommand = (command: string, cmdValue?: string) => {
    document.execCommand(command, false, cmdValue);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  const updateContent = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-background">
      <div className="border-b bg-muted/50 p-2 flex items-center gap-2 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("bold")} className="h-8 w-8 p-0" title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("italic")} className="h-8 w-8 p-0" title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("underline")} className="h-8 w-8 p-0" title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyLeft")} className="h-8 w-8 p-0" title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyCenter")} className="h-8 w-8 p-0" title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("justifyRight")} className="h-8 w-8 p-0" title="Align Right">
          <AlignRight className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("insertUnorderedList")} className="h-8 w-8 p-0" title="Bullet List">
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt("Enter URL:");
            if (url) execCommand("createLink", url);
          }}
          className="h-8 w-8 p-0"
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={updateContent}
        className="min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );
}
