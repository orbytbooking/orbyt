"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME = "Hi! I’m your virtual receptionist. Ask me about our services, how to book, or anything else. I’m here to help.";

interface ReceptionistChatProps {
  /** When provided (e.g. in admin CRM), use this business for context instead of URL. */
  businessId?: string | null;
}

export function ReceptionistChat({ businessId: businessIdProp }: ReceptionistChatProps = {}) {
  const searchParams = useSearchParams();
  const businessIdFromUrl = searchParams?.get("business") ?? "";
  const businessId = businessIdProp ?? businessIdFromUrl;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all",
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
            "fixed bottom-24 right-6 z-50 flex flex-col",
            "w-[min(380px,calc(100vw-3rem))] h-[min(480px,70vh)]",
            "rounded-2xl border bg-card shadow-xl"
          )}
        >
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <span className="font-semibold">Chat with us</span>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm max-w-[85%]",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto flex w-fit items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about services or booking..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
