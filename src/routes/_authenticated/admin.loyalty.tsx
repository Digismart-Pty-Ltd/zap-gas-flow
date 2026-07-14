import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/loyalty")({ component: LoyaltyAdmin });

function LoyaltyAdmin() {
  const { data: events = [] } = useQuery({
    queryKey: ["admin-loyalty-events"],
    queryFn: async () => (await supabase.from("loyalty_events").select("*").order("created_at",{ascending:false}).limit(200)).data ?? [],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Loyalty ledger</h1>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-xs">{fmtDateTime(e.created_at)}</TableCell>
              <TableCell className="font-mono text-xs">{e.customer_id.slice(0,8)}</TableCell>
              <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${e.type === "redeem" ? "bg-accent/20" : "bg-secondary"}`}>{e.type}</span></TableCell>
              <TableCell>{e.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  );
}
