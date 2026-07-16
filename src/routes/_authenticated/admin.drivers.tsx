import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { grantRoleByEmail } from "@/lib/dev-roles.functions";

export const Route = createFileRoute("/_authenticated/admin/drivers")({ component: Drivers });

function Drivers() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const grant = useServerFn(grantRoleByEmail);
  const { data: drivers = [] } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, profiles:user_id(id, full_name, phone)").eq("role","driver");
      return data ?? [];
    },
  });

  async function promote() {
    if (!email.trim()) return;
    try {
      await grant({ data: { email: email.trim(), role: "driver" } });
      toast.success(`${email} is now a driver`);
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      setEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to grant driver role");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Drivers</h1>
      <Card><CardContent className="space-y-3 p-5">
        <p className="text-sm font-semibold">Add driver</p>
        <div className="flex gap-2 max-w-lg">
          <Input placeholder="User UUID" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={promote}>Grant driver role</Button>
        </div>
        <p className="text-xs text-muted-foreground">Find the user's UUID under Cloud → Users. In production you'd add an email lookup admin function.</p>
      </CardContent></Card>

      <Card><CardContent className="p-5">
        <p className="mb-3 text-sm font-semibold">Active drivers ({drivers.length})</p>
        <div className="space-y-2">
          {drivers.map((d: any) => (
            <div key={d.user_id} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">{d.profiles?.full_name ?? "Unnamed driver"}</p>
                <p className="text-xs text-muted-foreground font-mono">{d.user_id}</p>
              </div>
              {d.profiles?.phone && <span className="text-sm text-muted-foreground">{d.profiles.phone}</span>}
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}
