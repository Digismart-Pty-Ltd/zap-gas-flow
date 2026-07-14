import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CYLINDER_LABEL, ORDER_STATUS_LABEL, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { MapPin, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/driver/")({
  component: DriverJobs,
});

function DriverJobs() {
  const { user } = useCurrentUser();

  const { data: assigned = [], refetch: refetchAssigned } = useQuery({
    queryKey: ["driver-assigned", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*").eq("driver_id", user!.id).not("status","in","(delivered,cancelled)").order("created_at")).data ?? [],
  });

  const { data: available = [], refetch: refetchAvailable } = useQuery({
    queryKey: ["driver-available"],
    queryFn: async () => (await supabase.from("orders").select("*").is("driver_id", null).eq("status","pending").order("urgent",{ascending:false}).order("created_at").limit(20)).data ?? [],
  });

  async function accept(id: string) {
    const { error } = await supabase.from("orders").update({ driver_id: user!.id, status: "assigned" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Job accepted");
    refetchAssigned(); refetchAvailable();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Your active jobs</h2>
        {assigned.length === 0 && <p className="text-sm text-muted-foreground">Nothing active — grab one below.</p>}
        <div className="space-y-3">
          {assigned.map((o) => (
            <Link key={o.id} to="/driver/job/$id" params={{ id: o.id }}>
              <Card className="hover:border-accent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium">{ORDER_STATUS_LABEL[o.status]}</span>
                    {o.urgent && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs">Urgent</span>}
                  </div>
                  <p className="mt-2 font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> {CYLINDER_LABEL[o.cylinder_size]} × {o.qty}</p>
                  <p className="mt-1 text-sm text-muted-foreground flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" /> {o.address_snapshot}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Available jobs</h2>
        {available.length === 0 && <p className="text-sm text-muted-foreground">No open jobs right now.</p>}
        <div className="space-y-3">
          {available.map((o) => (
            <Card key={o.id}><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{CYLINDER_LABEL[o.cylinder_size]} × {o.qty}</p>
                {o.urgent && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs">Urgent</span>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" /> {o.address_snapshot}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(o.created_at)}</p>
              <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => accept(o.id)} className="flex-1">Accept</Button></div>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
