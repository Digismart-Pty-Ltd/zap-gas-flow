import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CYLINDER_LABEL, ORDER_STATUS_LABEL, fmtDateTime, zar } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: AdminOrders });

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, profiles!orders_customer_id_fkey(full_name)").order("created_at",{ascending:false}).limit(100)).data ?? [],
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["admin-drivers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, profiles:user_id(id, full_name)").eq("role","driver");
      return (data ?? []).map((r: any) => ({ id: r.user_id, name: r.profiles?.full_name ?? r.user_id.slice(0,8) }));
    },
  });

  async function assign(orderId: string, driverId: string) {
    const { error } = await supabase.from("orders").update({ driver_id: driverId, status: "assigned" }).eq("id", orderId);
    if (error) toast.error(error.message); else { toast.success("Driver assigned"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
  }
  async function setStatus(orderId: string, status: string) {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Placed</TableHead><TableHead>Cylinder</TableHead><TableHead>Status</TableHead>
            <TableHead>Driver</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="text-xs">{fmtDateTime(o.created_at)}</TableCell>
                <TableCell>{CYLINDER_LABEL[o.cylinder_size]} × {o.qty}</TableCell>
                <TableCell><span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{ORDER_STATUS_LABEL[o.status]}</span></TableCell>
                <TableCell>
                  <Select value={o.driver_id ?? ""} onValueChange={(v) => assign(o.id, v)}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Assign…" /></SelectTrigger>
                    <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{zar(Number(o.total))}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
