"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Link as LinkIcon,
  Image,
  Table2,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Verdana", value: "Verdana" },
  { label: "Tahoma", value: "Tahoma" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Helvetica", value: "Helvetica" },
];

const FONT_SIZES: { label: string; value: string }[] = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
];

function getDeletableBlockTable(table: HTMLTableElement, root: HTMLElement): HTMLTableElement | null {
  const block = table.closest("table[data-template-block]") as HTMLTableElement | null;
  if (block && root.contains(block)) return block;
  if (table.hasAttribute("data-template-shell")) return null;
  return table;
}

export function NotificationTemplateBodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const linkTargetRef = useRef<HTMLAnchorElement | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogMode, setLinkDialogMode] = useState<"edit" | "insert">("insert");
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableRowsDraft, setTableRowsDraft] = useState("2");
  const [tableColsDraft, setTableColsDraft] = useState("2");
  const selectionRangeRef = useRef<Range | null>(null);
  /** When parent `value` echoes our last onChange, skip resetting innerHTML so the browser undo stack is preserved. */
  const internalHtmlRef = useRef<string | null>(null);
  const tableToDeleteRef = useRef<HTMLTableElement | null>(null);
  const [deleteUiOpen, setDeleteUiOpen] = useState(false);
  const [deleteUiPos, setDeleteUiPos] = useState({ top: 0, left: 0 });

  /** Dialog content uses CSS transform; `fixed` + viewport rects misalign. Position vs editor wrap instead. */
  const updateDeleteUiPosition = useCallback(() => {
    const wrap = editorWrapRef.current;
    const tbl = tableToDeleteRef.current;
    if (!wrap || !tbl) return;
    const w = wrap.getBoundingClientRect();
    const r = tbl.getBoundingClientRect();
    setDeleteUiPos({
      top: Math.max(0, r.top - w.top + 4),
      left: Math.max(0, r.right - w.left - 44),
    });
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === internalHtmlRef.current) {
      internalHtmlRef.current = null;
      return;
    }
    el.innerHTML = value || "";
  }, [value]);

  const restoreSavedSelection = () => {
    const el = editorRef.current;
    const saved = selectionRangeRef.current;
    const sel = window.getSelection();
    if (!el || !saved || !sel) return;
    if (!el.contains(saved.startContainer) && !el.contains(saved.endContainer)) return;
    el.focus();
    sel.removeAllRanges();
    sel.addRange(saved.cloneRange());
  };

  const syncFromEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    internalHtmlRef.current = html;
    onChange(html);
  };

  useEffect(() => {
    if (!deleteUiOpen) return;
    updateDeleteUiPosition();
    const ed = editorRef.current;
    ed?.addEventListener("scroll", updateDeleteUiPosition, { passive: true });
    window.addEventListener("scroll", updateDeleteUiPosition, true);
    window.addEventListener("resize", updateDeleteUiPosition);
    return () => {
      ed?.removeEventListener("scroll", updateDeleteUiPosition);
      window.removeEventListener("scroll", updateDeleteUiPosition, true);
      window.removeEventListener("resize", updateDeleteUiPosition);
    };
  }, [deleteUiOpen, updateDeleteUiPosition]);

  const exec = (command: string, commandValue?: string) => {
    const el = editorRef.current;
    if (!el) return;
    restoreSavedSelection();
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
    try {
      document.execCommand(command, false, commandValue);
    } catch {
      /* ignore */
    }
    syncFromEditor();
  };

  const setParagraph = () => exec("formatBlock", "p");

  /** Inline spans so WYSIWYG shows font-size/color reliably (execCommand foreColor often fails vs inherited email HTML). */
  const wrapSelectionInStyledSpan = (styles: { color?: string; fontSize?: string }) => {
    const el = editorRef.current;
    if (!el) return;
    restoreSavedSelection();
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    if (styles.color) span.style.setProperty("color", styles.color, "important");
    if (styles.fontSize) span.style.setProperty("font-size", styles.fontSize, "important");

    if (range.collapsed) {
      span.appendChild(document.createTextNode("\u200b"));
      range.insertNode(span);
      const nr = document.createRange();
      nr.setStart(span.firstChild!, 1);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    } else {
      try {
        range.surroundContents(span);
      } catch {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
        sel.removeAllRanges();
        const nr = document.createRange();
        nr.selectNodeContents(span);
        nr.collapse(false);
        sel.addRange(nr);
      }
    }
    syncFromEditor();
  };

  const applyFontSizePx = (px: string) => wrapSelectionInStyledSpan({ fontSize: px });

  const applyFontFamily = (family: string) => {
    const el = editorRef.current;
    if (!el) return;
    restoreSavedSelection();
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
    try {
      document.execCommand("fontName", false, family);
    } catch {
      /* ignore */
    }
    syncFromEditor();
  };

  const applyForeColor = (color: string) => wrapSelectionInStyledSpan({ color });

  const handleInput = () => {
    syncFromEditor();
  };

  const captureSelectionBeforeToolbar = () => {
    const sel = window.getSelection();
    if (sel?.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      selectionRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const toolbarPointerDown = (e: MouseEvent) => {
    captureSelectionBeforeToolbar();
    e.preventDefault();
  };

  const toolbarCaptureSelectionOnly = () => {
    captureSelectionBeforeToolbar();
  };

  const styleCssAppliedRef = useRef(false);
  const handleEditorFocus = () => {
    if (styleCssAppliedRef.current) return;
    styleCssAppliedRef.current = true;
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
  };

  const closeLinkDialog = () => {
    setLinkDialogOpen(false);
    linkTargetRef.current = null;
    setLinkUrlDraft("");
    setLinkDialogMode("insert");
  };

  const openLinkDialogForInsert = () => {
    linkTargetRef.current = null;
    setLinkDialogMode("insert");
    setLinkUrlDraft("https://");
    setLinkDialogOpen(true);
  };

  const openLinkDialogForAnchor = (anchor: HTMLAnchorElement) => {
    linkTargetRef.current = anchor;
    setLinkDialogMode("edit");
    setLinkUrlDraft(anchor.getAttribute("href") || "");
    setLinkDialogOpen(true);
  };

  const saveLinkDialog = () => {
    const trimmed = linkUrlDraft.trim();
    const anchor = linkTargetRef.current;
    if (anchor) {
      if (trimmed) anchor.setAttribute("href", trimmed);
      else anchor.setAttribute("href", "#");
      syncFromEditor();
    } else if (trimmed) {
      editorRef.current?.focus();
      document.execCommand("createLink", false, trimmed);
      syncFromEditor();
    }
    closeLinkDialog();
  };

  const closeImageDialog = () => {
    setImageDialogOpen(false);
    setImageUrlDraft("");
  };

  const saveImageDialog = () => {
    const trimmed = imageUrlDraft.trim();
    if (trimmed) {
      editorRef.current?.focus();
      document.execCommand("insertImage", false, trimmed);
      syncFromEditor();
    }
    closeImageDialog();
  };

  const closeTableDialog = () => {
    setTableDialogOpen(false);
    setTableRowsDraft("2");
    setTableColsDraft("2");
  };

  const saveTableDialog = () => {
    const rows = Math.min(10, Math.max(1, Number.parseInt(tableRowsDraft || "2", 10)));
    const cols = Math.min(8, Math.max(1, Number.parseInt(tableColsDraft || "2", 10)));
    const bodyRows = Array.from({ length: rows })
      .map(() => {
        const cells = Array.from({ length: cols })
          .map(
            () =>
              '<td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;min-width:60px;">&nbsp;</td>',
          )
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    const tableHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" data-template-block="user" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;">${bodyRows}</table><p><br></p>`;
    // Keep insertion point stable even if focus moved to the dialog.
    const saved = selectionRangeRef.current;
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (saved && sel) {
      sel.removeAllRanges();
      sel.addRange(saved.cloneRange());
    }
    document.execCommand("insertHTML", false, tableHtml);
    syncFromEditor();
    closeTableDialog();
  };

  const handleEditorMouseDownCapture = (e: MouseEvent<HTMLDivElement>) => {
    const root = editorRef.current;
    const t = e.target as HTMLElement | null;
    const anchor = t?.closest?.("a");
    if (root && anchor && root.contains(anchor)) {
      e.preventDefault();
    }
  };

  const deleteCurrentTable = () => {
    const root = editorRef.current;
    const tbl = tableToDeleteRef.current;
    if (!root || !tbl) return;
    const toRemove = getDeletableBlockTable(tbl, root);
    if (!toRemove) return;
    toRemove.parentNode?.removeChild(toRemove);
    tableToDeleteRef.current = null;
    setDeleteUiOpen(false);
    syncFromEditor();
  };

  const handleEditorClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    const root = editorRef.current;
    const t = e.target as HTMLElement | null;
    const anchor = t?.closest?.("a");
    if (!root || !t) return;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRangeRef.current = sel.getRangeAt(0).cloneRange();
    }

    if (anchor && root.contains(anchor)) {
      e.preventDefault();
      e.stopPropagation();
      openLinkDialogForAnchor(anchor);
      return;
    }

    let cur: HTMLElement | null = t;
    let innerTable: HTMLTableElement | null = null;
    while (cur && root.contains(cur)) {
      if (cur.tagName === "TABLE") {
        const tbl = cur as HTMLTableElement;
        if (!tbl.hasAttribute("data-template-shell")) {
          innerTable = tbl;
          break;
        }
      }
      cur = cur.parentElement;
    }

    if (!innerTable) {
      tableToDeleteRef.current = null;
      setDeleteUiOpen(false);
      return;
    }

    const block = getDeletableBlockTable(innerTable, root);
    if (!block) {
      tableToDeleteRef.current = null;
      setDeleteUiOpen(false);
      return;
    }

    tableToDeleteRef.current = block;
    setDeleteUiOpen(true);
    queueMicrotask(() => updateDeleteUiPosition());
  };

  const wordCount = (() => {
    if (typeof document === "undefined") return 0;
    const div = document.createElement("div");
    div.innerHTML = value || "";
    const text = (div.innerText || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  })();

  return (
    <>
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="border-b p-2 flex items-center gap-1 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("bold")} className="h-8 w-8 p-0" title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("italic")} className="h-8 w-8 p-0" title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("underline")} className="h-8 w-8 p-0" title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("strikeThrough")} className="h-8 w-8 p-0" title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("justifyLeft")} className="h-8 w-8 p-0" title="Align left">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("justifyCenter")} className="h-8 w-8 p-0" title="Align center">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("justifyRight")} className="h-8 w-8 p-0" title="Align right">
          <AlignRight className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("insertUnorderedList")} className="h-8 w-8 p-0" title="Bullet list">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={setParagraph} className="h-8 px-2" title="Paragraph">
          P
        </Button>
        <span className="w-px h-6 bg-border mx-1" />
        <Select onValueChange={(v) => applyFontFamily(v)}>
          <SelectTrigger
            className="h-8 w-[132px] text-xs"
            title="Font"
            onMouseDown={toolbarCaptureSelectionOnly}
          >
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => applyFontSizePx(v)}>
          <SelectTrigger
            className="h-8 w-[84px] text-xs"
            title="Font size"
            onMouseDown={toolbarCaptureSelectionOnly}
          >
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex h-8 w-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-0.5" title="Text color">
          <input
            type="color"
            className="h-6 w-full cursor-pointer rounded border-0 bg-transparent p-0"
            defaultValue="#000000"
            onMouseDown={toolbarCaptureSelectionOnly}
            onChange={(e) => applyForeColor(e.target.value)}
          />
        </label>
        <span className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={toolbarPointerDown}
          onClick={openLinkDialogForInsert}
          className="h-8 w-8 p-0"
          title="Insert link (select text first, or click a link in the template to edit)"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={toolbarPointerDown}
          onClick={() => {
            setImageUrlDraft("https://");
            setImageDialogOpen(true);
          }}
          className="h-8 w-8 p-0"
          title="Insert image"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={toolbarPointerDown}
          onClick={() => setTableDialogOpen(true)}
          className="h-8 w-8 p-0"
          title="Insert table"
        >
          <Table2 className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("undo")} className="h-8 w-8 p-0" title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onMouseDown={toolbarPointerDown} onClick={() => exec("redo")} className="h-8 w-8 p-0" title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <div ref={editorWrapRef} className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={handleEditorFocus}
          onMouseDownCapture={handleEditorMouseDownCapture}
          onClickCapture={handleEditorClickCapture}
          className="template-body-editor min-h-[380px] max-h-[min(70vh,520px)] overflow-y-auto p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/20"
          style={{ whiteSpace: "pre-wrap" }}
        />
        {deleteUiOpen ? (
          <div
            className="pointer-events-auto absolute z-50 flex items-center rounded-md border bg-popover p-1 shadow-md"
            style={{ top: deleteUiPos.top, left: deleteUiPos.left }}
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Delete table"
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                deleteCurrentTable();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="border-t px-3 py-1.5 text-right text-xs text-muted-foreground">
        {wordCount} word(s)
      </div>
    </div>

    <Dialog open={linkDialogOpen} onOpenChange={(open) => { if (!open) closeLinkDialog(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{linkDialogMode === "edit" ? "Edit link" : "Insert link"}</DialogTitle>
          <DialogDescription>
            {linkDialogMode === "edit"
              ? "Update the URL for this link. Use mailto:email@example.com for email links."
              : "Select text in the template first, then paste or type the full URL (https://…)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="template-link-url">URL</Label>
          <Input
            id="template-link-url"
            value={linkUrlDraft}
            onChange={(e) => setLinkUrlDraft(e.target.value)}
            placeholder="https://example.com or mailto:support@example.com"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveLinkDialog();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={closeLinkDialog}>
            Cancel
          </Button>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={saveLinkDialog}>
            {linkDialogMode === "edit" ? "Save link" : "Insert link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={imageDialogOpen} onOpenChange={(open) => { if (!open) closeImageDialog(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>Paste the full image URL. The image must be publicly reachable (HTTPS).</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="template-image-url">Image URL</Label>
          <Input
            id="template-image-url"
            value={imageUrlDraft}
            onChange={(e) => setImageUrlDraft(e.target.value)}
            placeholder="https://yourdomain.com/images/banner.png"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveImageDialog();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={closeImageDialog}>
            Cancel
          </Button>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={saveImageDialog}>
            Insert image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={tableDialogOpen} onOpenChange={(open) => { if (!open) closeTableDialog(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert table</DialogTitle>
          <DialogDescription>Choose the number of rows and columns for the new table.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="space-y-2">
            <Label htmlFor="template-table-rows">Rows</Label>
            <Input
              id="template-table-rows"
              type="number"
              min={1}
              max={10}
              value={tableRowsDraft}
              onChange={(e) => setTableRowsDraft(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-table-cols">Columns</Label>
            <Input
              id="template-table-cols"
              type="number"
              min={1}
              max={8}
              value={tableColsDraft}
              onChange={(e) => setTableColsDraft(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={closeTableDialog}>
            Cancel
          </Button>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={saveTableDialog}>
            Insert table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <style jsx>{`
      .template-body-editor :global(table) {
        outline: 1px dashed #9ca3af;
        outline-offset: -1px;
      }
      .template-body-editor :global(td),
      .template-body-editor :global(th) {
        outline: 1px dashed #c4c7cc;
        outline-offset: -1px;
      }
    `}</style>
    </>
  );
}