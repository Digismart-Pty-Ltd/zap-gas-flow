import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CYLINDER_LABEL, fmtDate, zar } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({ component: Subs });

function Subs() {
  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => (await supabase.from("subscriptions").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Customer</TableHead><TableHead>Plan</TableHead><TableHead>Cylinder</TableHead>
          <TableHead>Next refill</TableHead><TableHead>Cycle</TableHead><TableHead>Monthly</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {subs.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.customer_id.slice(0,8)}</TableCell>
              <TableCell>{s.plan === "plan_2" ? "2-cyl" : "3-cyl"}</TableCell>
              <TableCell>{CYLINDER_LABEL[s.cylinder_size]}</TableCell>
              <TableCell>{fmtDate(s.next_refill_date)}</TableCell>
              <TableCell className="capitalize">{s.billing_cycle}</TableCell>
              <TableCell>{zar(Number(s.monthly_price))}</TableCell>
              <TableCell><span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{s.status}</span></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  );
}
