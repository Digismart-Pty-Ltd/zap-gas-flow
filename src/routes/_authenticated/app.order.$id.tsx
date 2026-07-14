import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, Truck, Package, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CYLINDER_LABEL, ORDER_STATUS_LABEL, ORDER_STATUS_STEPS, fmtDateTime, zar } from "@/lib/format";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/app/order/$id")({
  component: OrderTrack,
});

function OrderTrack() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await supabase.from("orders").select("*").eq("id", id).maybeSingle()).data,
    refetchInterval: 15_000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["order-events", id],
    queryFn: async () => (await supabase.from("order_events").select("*").eq("order_id", id).order("created_at")).data ?? [],
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const ch = supabase.channel(`order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["order", id] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_events", filter: `order_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["order-events", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (!order) return <div className="py-10 text-center text-muted-foreground">Loading order…</div>;

  const currentIdx = ORDER_STATUS_STEPS.indexOf(order.status as any);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app/orders" })}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">Track order</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Status</p>
              <p className="text-lg font-semibold">{ORDER_STATUS_LABEL[order.status]}</p>
              {order.eta && order.status !== "delivered" && order.status !== "cancelled" && (
                <p className="text-xs text-muted-foreground">ETA: {fmtDateTime(order.eta)}</p>
              )}
            </div>
            {order.urgent && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground">Urgent</span>}
          </div>

          {/* Progress rail */}
          <div className="relative pl-6">
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
            {ORDER_STATUS_STEPS.map((s, i) => {
              const done = i <= currentIdx && order.status !== "cancelled";
              const active = i === currentIdx;
              const evt = events.find((e) => e.status === s);
              return (
                <div key={s} className="relative pl-3 py-2">
                  <div className={`absolute -left-[19px] top-3 grid h-5 w-5 place-items-center rounded-full border-2 ${done ? "border-accent bg-accent" : "border-border bg-background"}`}>
                    {done && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <p className={`text-sm ${active ? "font-semibold" : done ? "" : "text-muted-foreground"}`}>{ORDER_STATUS_LABEL[s]}</p>
                  {evt && <p className="text-xs text-muted-foreground">{fmtDateTime(evt.created_at)}</p>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <Row icon={Package} label="Cylinder">{CYLINDER_LABEL[order.cylinder_size]} × {order.qty}</Row>
          <Row icon={MapPin} label="Delivering to">{order.address_snapshot}</Row>
          <Row icon={Truck} label="Total">{zar(Number(order.total))}{order.loyalty_applied && <span className="ml-2 text-xs text-success">Reward applied</span>}</Row>
          {order.notes && <Row icon={Phone} label="Notes">{order.notes}</Row>}
        </CardContent>
      </Card>

      <Link to="/app/orders">
        <Button variant="outline" className="w-full">View all orders</Button>
      </Link>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Truck; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
