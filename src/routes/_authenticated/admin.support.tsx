import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime } from "@/lib/format";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support")({ component: Support });

function Support() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-support"],
    queryFn: async () =>
      (
        await supabase
          .from("support_messages")
          .select("*, profiles!support_messages_user_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(500)
      ).data ?? [],
    refetchInterval: 15_000,
  });

  const threads = useMemo(() => {
    const byUser = new Map<string, { userId: string; name: string; last: any; unread: number }>();
    for (const m of messages as any[]) {
      const existing = byUser.get(m.user_id);
      if (!existing) {
        byUser.set(m.user_id, {
          userId: m.user_id,
          name: m.profiles?.full_name ?? m.user_id.slice(0, 8),
          last: m,
          unread: m.from_role === "customer" && !m.read ? 1 : 0,
        });
      } else if (m.from_role === "customer" && !m.read) {
        existing.unread += 1;
      }
    }
    return [...byUser.values()].sort(
      (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime(),
    );
  }, [messages]);

  const thread = useMemo(
    () =>
      (messages as any[])
        .filter((m) => m.user_id === selected)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages, selected],
  );

  async function openThread(userId: string) {
    setSelected(userId);
    await supabase
      .from("support_messages")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("from_role", "customer")
      .eq("read", false);
    qc.invalidateQueries({ queryKey: ["admin-support"] });
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    const { error } = await supabase
      .from("support_messages")
      .insert({ user_id: selected, from_role: "admin", message: reply.trim() });
    if (error) return toast.error(error.message);
    setReply("");
    qc.invalidateQueries({ queryKey: ["admin-support"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Support inbox</h1>
      <p className="text-xs text-muted-foreground">
        Conversations auto-clear 14 days after each message.
      </p>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-1 p-2">
            {threads.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No messages.</p>
            )}
            {threads.map((t) => (
              <button
                key={t.userId}
                onClick={() => openThread(t.userId)}
                className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-sm ${selected === t.userId ? "bg-accent/15" : "hover:bg-secondary"}`}
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground max-w-[180px]">
                    {t.last.message}
                  </p>
                </div>
                {t.unread > 0 && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    {t.unread}
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex h-[70vh] flex-col">
          <CardContent className="flex flex-1 flex-col gap-3 p-4">
            {!selected && (
              <p className="m-auto text-sm text-muted-foreground">Select a conversation</p>
            )}
            {selected && (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {thread.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.from_role === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.from_role === "admin" ? "bg-accent/20" : "bg-secondary"}`}
                      >
                        <p>{m.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {fmtDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={1}
                    className="min-h-0 resize-none"
                  />
                  <Button size="icon" onClick={sendReply} disabled={!reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
