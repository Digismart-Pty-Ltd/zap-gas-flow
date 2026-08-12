import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CYLINDER_LABEL, fmtDate, zar } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({ component: Subs });

function Subs() {
  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () =>
      (
        await supabase
          .from("subscriptions")
          .select("*, profiles!subscriptions_customer_id_fkey(full_name)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: assetCounts = {} } = useQuery({
    queryKey: ["admin-subs-cylinder-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cylinder_assets")
        .select("subscription_id")
        .not("subscription_id", "is", null);
      const counts: Record<string, number> = {};
      for (const row of data ?? [])
        counts[row.subscription_id as string] = (counts[row.subscription_id as string] ?? 0) + 1;
      return counts;
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Cylinder</TableHead>
                <TableHead>Exclusive units</TableHead>
                <TableHead>Next refill</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.profiles?.full_name ?? s.customer_id.slice(0, 8)}</TableCell>
                  <TableCell>{s.plan === "plan_2" ? "2-cyl" : "3-cyl"}</TableCell>
                  <TableCell>{CYLINDER_LABEL[s.cylinder_size]}</TableCell>
                  <TableCell>{(assetCounts as Record<string, number>)[s.id] ?? 0}</TableCell>
                  <TableCell>{fmtDate(s.next_refill_date)}</TableCell>
                  <TableCell>
                    {zar(Number(s.deposit_amount))}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({s.deposit_payment_status})
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                      {s.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
