import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Clock } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/support")({
  component: SupportChat,
});

function SupportChat() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["support-thread", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("support_messages")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: true })
      ).data ?? [],
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`support-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["support-thread", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!msg.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        user_id: user.id,
        from_role: "customer",
        message: msg.trim(),
      });
      if (error) throw error;
      setMsg("");
      qc.invalidateQueries({ queryKey: ["support-thread", user.id] });
    } catch (err: any) {
      toast.error(err.message ?? "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app/profile" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Support chat</h1>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> Messages auto-clear after 14 days
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border bg-card p-3">
        {messages.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Send a message and the Zap Gas team will get back to you here.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.from_role === "customer" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from_role === "customer" ? "bg-accent/20 text-foreground" : "bg-secondary"}`}
            >
              <p>{m.message}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="How can we help?"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={1}
          className="min-h-0 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button size="icon" onClick={send} disabled={sending || !msg.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
