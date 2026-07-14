import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check } from "lucide-react";
import { CYLINDER_LABEL, zar } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/subscription/new")({
  component: NewSub,
});

function NewSub() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"plan_2" | "plan_3">("plan_2");
  const [size, setSize] = useState<"kg9" | "kg19" | "kg48">("kg19");
  const [freq, setFreq] = useState(30);
  const [cycle, setCycle] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);

  const { data: sizes = [] } = useQuery({
    queryKey: ["cyl-sizes"],
    queryFn: async () => (await supabase.from("cylinder_sizes").select("*")).data ?? [],
  });
  const price = Number(sizes.find((s) => s.size === size)?.base_price ?? 0);
  const qty = plan === "plan_2" ? 2 : 3;
  const monthly = ((price * qty) / freq) * 30;

  async function submit() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("subscriptions").insert({
        customer_id: user!.id, plan, cylinder_size: size,
        usage_frequency_days: freq, billing_cycle: cycle,
        monthly_price: Number(monthly.toFixed(2)),
        next_refill_date: new Date(Date.now() + freq * 86400_000).toISOString().slice(0, 10),
      }).select("*").single();
      if (error) throw error;
      // Also create initial delivery order
      await supabase.from("orders").insert({
        customer_id: user!.id, cylinder_size: size, qty,
        address_snapshot: "Address to confirm — please update in profile",
        subtotal: price * qty, total: price * qty,
        payment_status: "mock_paid",
        subscription_id: data.id,
        notes: "Initial subscription delivery",
        eta: new Date(Date.now() + 24 * 3600_000).toISOString(),
      });
      toast.success("Subscription started! Initial delivery is on its way.");
      navigate({ to: "/app/subscription" });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app/subscription" })}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">Choose a plan</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["plan_2", "plan_3"] as const).map((p) => (
          <button key={p} onClick={() => setPlan(p)} className={`rounded-2xl border p-4 text-left transition-all ${plan === p ? "border-accent bg-accent/10" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-muted-foreground">{p === "plan_2" ? "2-cyl" : "3-cyl"}</span>
              {plan === p && <div className="grid h-5 w-5 place-items-center rounded-full zap-accent-gradient"><Check className="h-3 w-3 text-primary" /></div>}
            </div>
            <p className="mt-1 font-bold">{p === "plan_2" ? "2 cylinders" : "3 cylinders"}</p>
            <p className="text-xs text-muted-foreground">Ideal for {p === "plan_2" ? "small households" : "families & small businesses"}</p>
          </button>
        ))}
      </div>

      <Card><CardContent className="space-y-3 p-5">
        <p className="text-sm font-medium">Cylinder size</p>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map((s) => (
            <button key={s.size} onClick={() => setSize(s.size as any)} className={`rounded-xl border p-3 text-center text-sm ${size === s.size ? "border-accent bg-accent/10 font-semibold" : ""}`}>{s.label.replace(" Cylinder","")}</button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Refill every</Label>
          <div className="grid grid-cols-4 gap-2">
            {[14, 21, 30, 45].map((n) => (
              <button key={n} onClick={() => setFreq(n)} className={`rounded-xl border p-2 text-sm ${freq === n ? "border-accent bg-accent/10 font-semibold" : ""}`}>{n}d</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Billing</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["monthly", "quarterly", "annual"] as const).map((c) => (
              <button key={c} onClick={() => setCycle(c)} className={`rounded-xl border p-2 text-sm capitalize ${cycle === c ? "border-accent bg-accent/10 font-semibold" : ""}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-secondary p-3 text-sm">
          <div className="flex justify-between"><span>Estimated monthly</span><strong>{zar(monthly)}</strong></div>
          <p className="mt-1 text-xs text-muted-foreground">Based on {qty} × {CYLINDER_LABEL[size]} every {freq} days.</p>
        </div>

        <Button className="w-full" onClick={submit} disabled={loading}>Start subscription</Button>
      </CardContent></Card>
    </div>
  );
}
