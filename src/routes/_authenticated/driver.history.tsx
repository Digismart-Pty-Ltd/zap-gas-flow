import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { CYLINDER_LABEL, fmtDateTime } from "@/lib/format";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/driver/history")({
  component: History,
});

function History() {
  const { user } = useCurrentUser();
  const { data: jobs = [] } = useQuery({
    queryKey: ["driver-history", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*").eq("driver_id", user!.id).eq("status","delivered").order("updated_at",{ascending:false})).data ?? [],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Delivery history</h1>
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold">{jobs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Today</p><p className="text-2xl font-bold">{jobs.filter(j => new Date(j.updated_at).toDateString() === new Date().toDateString()).length}</p></CardContent></Card>
      </div>
      <div className="space-y-2">
        {jobs.map((j) => (
          <Card key={j.id}><CardContent className="flex items-center gap-3 p-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <div className="flex-1"><p className="text-sm font-medium">{CYLINDER_LABEL[j.cylinder_size]} × {j.qty}</p><p className="text-xs text-muted-foreground">{fmtDateTime(j.updated_at)}</p></div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
