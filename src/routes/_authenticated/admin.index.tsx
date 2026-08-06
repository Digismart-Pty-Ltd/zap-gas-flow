import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, Users, TrendingUp, Gift, CalendarClock, Box } from "lucide-react";
import { zar } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Overview });

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const weekOut = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
      const [orders, active, customers, revenue, stock, dueRefills, readyRewards] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).not("status", "in", "(delivered,cancelled)"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total").eq("payment_status", "mock_paid"),
        supabase.from("cylinder_assets").select("id", { count: "exact", head: true }).eq("status", "in_stock"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").lte("next_refill_date", weekOut),
        supabase.from("loyalty_credits").select("customer_id", { count: "exact", head: true }).eq("free_cylinder_ready", true),
      ]);
      const rev = (revenue.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      return {
        orders: orders.count ?? 0,
        active: active.count ?? 0,
        customers: customers.count ?? 0,
        revenue: rev,
        stock: stock.count ?? 0,
        dueRefills: dueRefills.count ?? 0,
        readyRewards: readyRewards.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Total orders", value: data?.orders ?? 0, icon: Package },
    { label: "Active deliveries", value: data?.active ?? 0, icon: Truck },
    { label: "Customers", value: data?.customers ?? 0, icon: Users },
    { label: "Revenue (mock)", value: zar(data?.revenue ?? 0), icon: TrendingUp },
    { label: "Cylinders in stock", value: data?.stock ?? 0, icon: Box },
    { label: "Refills due (7d)", value: data?.dueRefills ?? 0, icon: CalendarClock },
    { label: "Rewards ready to redeem", value: data?.readyRewards ?? 0, icon: Gift },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Zap Gas — operations dashboard</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}><CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground"><span className="text-sm">{s.label}</span><s.icon className="h-4 w-4" /></div>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
