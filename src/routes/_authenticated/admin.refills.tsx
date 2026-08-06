import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CYLINDER_LABEL, fmtDate } from "@/lib/format";
import { Gift, CalendarPlus, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/refills")({ component: Refills });

function Refills() {
  const qc = useQueryClient();

  // Active subscriptions due within 7 days that don't have a scheduled refill yet.
  const { data: due = [] } = useQuery({
    queryKey: ["admin-refills-due"],
    queryFn: async () => {
      const weekOut = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*, profiles!subscriptions_customer_id_fkey(full_name)")
        .eq("status", "active")
        .lte("next_refill_date", weekOut);
      const { data: scheduled } = await supabase.from("subscription_refills").select("subscription_id").eq("status", "scheduled");
      const scheduledIds = new Set((scheduled ?? []).map((r) => r.subscription_id));
      return (subs ?? []).filter((s) => !scheduledIds.has(s.id));
    },
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ["admin-refills-scheduled"],
    queryFn: async () =>
      (await supabase
        .from("subscription_refills")
        .select("*, subscriptions!inner(plan, cylinder_size, customer_id, profiles!subscriptions_customer_id_fkey(full_name))")
        .eq("status", "scheduled")
        .order("scheduled_date", { ascending: true })).data ?? [],
  });

  async function schedule(subscriptionId: string) {
    const { error } = await supabase.rpc("generate_subscription_refill", { p_subscription_id: subscriptionId });
    if (error) return toast.error(error.message);
    toast.success("Refill scheduled");
    qc.invalidateQueries({ queryKey: ["admin-refills-due"] });
    qc.invalidateQueries({ queryKey: ["admin-refills-scheduled"] });
  }

  async function fulfill(refillId: string) {
    const { error } = await supabase.rpc("fulfill_subscription_refill", { p_refill_id: refillId });
    if (error) return toast.error(error.message);
    toast.success("Refill order created");
    qc.invalidateQueries({ queryKey: ["admin-refills-scheduled"] });
    qc.invalidateQueries({ queryKey: ["admin-refills-due"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Refills</h1>
        <p className="text-sm text-muted-foreground">Schedule upcoming subscription refills, then fulfill them to generate the delivery order.</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Due within 7 days — not yet scheduled</h2>
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Plan</TableHead><TableHead>Due</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {due.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Nothing due right now</TableCell></TableRow>}
            {due.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{s.profiles?.full_name ?? s.customer_id.slice(0, 8)}</TableCell>
                <TableCell>{s.plan === "plan_2" ? "2-cyl" : "3-cyl"} · {CYLINDER_LABEL[s.cylinder_size]}</TableCell>
                <TableCell>{fmtDate(s.next_refill_date)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => schedule(s.id)}>
                    <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Schedule
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></CardContent></Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Scheduled — ready to fulfill</h2>
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Plan</TableHead><TableHead>Scheduled</TableHead><TableHead>Reward</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {scheduled.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No scheduled refills</TableCell></TableRow>}
            {scheduled.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.subscriptions?.profiles?.full_name ?? r.subscriptions?.customer_id?.slice(0, 8)}</TableCell>
                <TableCell>{r.subscriptions?.plan === "plan_2" ? "2-cyl" : "3-cyl"} · {CYLINDER_LABEL[r.subscriptions?.cylinder_size]}</TableCell>
                <TableCell>{fmtDate(r.scheduled_date)}</TableCell>
                <TableCell>{r.free_cylinder_applied ? <span className="flex items-center gap-1 text-xs text-accent-foreground"><Gift className="h-3.5 w-3.5" /> Free</span> : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => fulfill(r.id)}>
                    <Truck className="mr-1.5 h-3.5 w-3.5" /> Fulfill
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></CardContent></Card>
      </div>
    </div>
  );
}
