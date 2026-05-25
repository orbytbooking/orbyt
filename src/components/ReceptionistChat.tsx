"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME = "Hi! I’m your virtual receptionist. Ask me about our services, how to book, or anything else. I’m here to help.";

interface ReceptionistChatProps {
  /** When provided (e.g. in admin CRM), use this business for context instead of URL. */
  businessId?: string | null;
  /** When provided (e.g. from admin layout), use solid light or dark panel. Omit for light. */
  theme?: "light" | "dark";
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-hidden>
      <span className="h-2 w-2 rounded-full bg-current opacity-70 animate-[bounce_0.6s_ease-in-out_infinite]" />
      <span className="h-2 w-2 rounded-full bg-current opacity-70 animate-[bounce_0.6s_ease-in-out_0.1s_infinite]" />
      <span className="h-2 w-2 rounded-full bg-current opacity-70 animate-[bounce_0.6s_ease-in-out_0.2s_infinite]" />
    </div>
  );
}

export function ReceptionistChat({ businessId: businessIdProp, theme: themeProp }: ReceptionistChatProps = {}) {
  const searchParams = useSearchParams();
  const businessIdFromUrl = searchParams?.get("business") ?? "";
  const businessId = businessIdProp ?? businessIdFromUrl;
  const isDark = themeProp === "dark";
  const panelBg = isDark ? "#18181b" : "#ffffff";
  const borderColor = isDark ? "#3f3f46" : "#e4e4e7";
  const headerText = isDark ? "text-zinc-100" : "text-zinc-900";
  const headerSubtext = isDark ? "text-zinc-400" : "text-zinc-500";
  const assistantBubble = isDark ? "bg-zinc-700/90 text-zinc-100" : "bg-zinc-100 text-zinc-900";
  const inputBg = isDark ? "bg-zinc-800 border-zinc-600" : "bg-zinc-50 border-zinc-200";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/receptionist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: businessId || undefined,
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Something went wrong. Please try again or use the Book Now page.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message || "No response." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn’t connect. Please try again or use the Book Now page.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl transition-all duration-200",
          "hover:scale-105 active:scale-95 ring-4 ring-primary/20 hover:ring-primary/30",
          "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden",
            "w-[min(392px,calc(100vw-2rem))] h-[min(520px,75vh)]",
            "rounded-2xl border-2 shadow-2xl",
            "animate-in slide-in-from-bottom-4 fade-in duration-200"
          )}
          style={{ backgroundColor: panelBg, borderColor }}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center gap-3 border-b px-4 py-3.5 shrink-0",
              headerText
            )}
            style={{ backgroundColor: panelBg, borderColor }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">Chat with us</p>
              <p className={cn("text-xs font-normal", headerSubtext)}>Typically replies in a few seconds</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4 pb-2" style={{ backgroundColor: panelBg }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      "shadow-sm",
                      m.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md",
                      m.role === "assistant" && assistantBubble
                    )}
                  >
                    <span className="whitespace-pre-wrap break-words">{m.content}</span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className={cn(
                      "rounded-2xl rounded-bl-md px-4 py-3 shadow-sm",
                      assistantBubble
                    )}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={scrollRef} className="h-2" />
            </div>
          </ScrollArea>

          {/* Input */}
          <form
            className="flex gap-2 border-t p-3 shrink-0"
            style={{ backgroundColor: panelBg, borderTopColor: borderColor }}
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about services or booking..."
              className={cn(
                "flex-1 rounded-xl border-2 py-2.5 px-4 text-sm placeholder:text-zinc-400",
                "focus-visible:ring-2 focus-visible:ring-primary/30 transition-shadow",
                inputBg
              )}
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className={cn(
                "h-11 w-11 shrink-0 rounded-xl transition-transform",
                "bg-primary hover:bg-primary/90 disabled:opacity-50",
                "hover:scale-105 active:scale-95"
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
