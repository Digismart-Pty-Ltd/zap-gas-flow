import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/support")({ component: Support });

function Support() {
  const { data: messages = [] } = useQuery({
    queryKey: ["admin-support"],
    queryFn: async () => (await supabase.from("support_messages").select("*").order("created_at",{ascending:false}).limit(200)).data ?? [],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Support inbox</h1>
      <div className="space-y-2">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
        {messages.map((m) => (
          <Card key={m.id}><CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">{m.user_id.slice(0,8)}</span>
              <span>{fmtDateTime(m.created_at)}</span>
            </div>
            <p className="mt-1 text-sm">{m.message}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
