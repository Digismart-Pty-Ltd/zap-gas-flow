import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false).then(() => qc.invalidateQueries({ queryKey: ["notif-unread", user.id] }));
  }, [user, qc]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Notifications</h1>
      {items.length === 0 && <div className="rounded-2xl border bg-card p-8 text-center"><Bell className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p></div>}
      {items.map((n) => (
        <Card key={n.id}><CardContent className="p-4">
          <p className="font-semibold">{n.title}</p>
          {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
          <p className="mt-2 text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</p>
        </CardContent></Card>
      ))}
    </div>
  );
}
