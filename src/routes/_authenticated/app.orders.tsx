import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { CYLINDER_LABEL, ORDER_STATUS_LABEL, fmtDateTime, zar } from "@/lib/format";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/orders")({
  component: OrdersList,
});

function OrdersList() {
  const { user } = useCurrentUser();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*").eq("customer_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to="/app/order/$id" params={{ id: o.id }}>
              <Card className="hover:border-accent/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary"><Package className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold">{CYLINDER_LABEL[o.cylinder_size]} × {o.qty}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(o.created_at)} · {ORDER_STATUS_LABEL[o.status]}</p>
                  </div>
                  <p className="text-sm font-semibold">{zar(Number(o.total))}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
