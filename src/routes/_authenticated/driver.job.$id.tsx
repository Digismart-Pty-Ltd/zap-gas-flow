import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Navigation, Camera, CheckCircle2 } from "lucide-react";
import { CYLINDER_LABEL, ORDER_STATUS_LABEL, ORDER_STATUS_STEPS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/driver/job/$id")({
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await supabase.from("orders").select("*").eq("id", id).maybeSingle()).data,
  });

  const steps = ["assigned", "en_route", "arriving", "delivered"] as const;

  async function advance() {
    if (!order) return;
    const cur = steps.indexOf(order.status as any);
    const next = steps[cur + 1] ?? "delivered";
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    if (next === "delivered") {
      await supabase.from("proof_of_delivery").insert({ order_id: id, driver_id: user!.id, photo_url: null, signature_url: null });
      toast.success("Delivery completed!");
    }
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["driver-assigned", user?.id] });
  }

  if (!order) return <p className="py-10 text-center">Loading…</p>;

  const nextIdx = steps.indexOf(order.status as any);
  const done = order.status === "delivered";

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address_snapshot)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/driver" })}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">Job detail</h1>
      </div>

      <Card><CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium">{ORDER_STATUS_LABEL[order.status]}</span>
          {order.urgent && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs">Urgent</span>}
        </div>
        <p className="text-lg font-semibold">{CYLINDER_LABEL[order.cylinder_size]} × {order.qty}</p>
        <div className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4" /> {order.address_snapshot}</div>
        {order.notes && <p className="rounded-xl bg-secondary p-3 text-sm">📝 {order.notes}</p>}
        <a href={mapsHref} target="_blank" rel="noreferrer"><Button variant="outline" className="w-full"><Navigation className="mr-2 h-4 w-4" />Open in Google Maps</Button></a>
      </CardContent></Card>

      {!done ? (
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={advance}>
            {nextIdx === 0 ? "Start trip" : nextIdx === 1 ? "I'm arriving" : nextIdx === 2 ? "Mark delivered" : "Complete"}
          </Button>
          {order.status === "arriving" && (
            <div className="rounded-xl border p-3 text-sm text-muted-foreground">
              <Camera className="mb-1 inline h-4 w-4" /> Proof of delivery (photo + signature) will be captured on delivery. Photo upload is stubbed in this preview.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-success flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" /> Delivered — nice work.
        </div>
      )}
    </div>
  );
}
