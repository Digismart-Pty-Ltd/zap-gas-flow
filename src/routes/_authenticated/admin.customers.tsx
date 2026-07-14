import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: Customers });

function Customers() {
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, loyalty_credits!left(credits, lifetime_earned, free_cylinders_redeemed)").limit(200);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Credits</TableHead><TableHead>Lifetime</TableHead><TableHead>Free redeemed</TableHead></TableRow></TableHeader>
        <TableBody>
          {customers.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell>{c.full_name ?? "—"}</TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell>{c.loyalty_credits?.[0]?.credits ?? 0}</TableCell>
              <TableCell>{c.loyalty_credits?.[0]?.lifetime_earned ?? 0}</TableCell>
              <TableCell>{c.loyalty_credits?.[0]?.free_cylinders_redeemed ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  );
}
