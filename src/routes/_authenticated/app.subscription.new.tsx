import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { CYLINDER_LABEL, zar } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/subscription/new")({
  component: NewSub,
});

function NewSub() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"plan_2" | "plan_3">("plan_2");
  const [size, setSize] = useState<"kg9" | "kg19" | "kg48">("kg9");
  const [freq, setFreq] = useState(30);
  const [loading, setLoading] = useState(false);

  const { data: sizes = [] } = useQuery({
    queryKey: ["cyl-sizes"],
    queryFn: async () => (await supabase.from("cylinder_sizes").select("*")).data ?? [],
  });
  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user!.id)
          .order("is_default", { ascending: false })
      ).data ?? [],
  });

  const price = Number(sizes.find((s) => s.size === size)?.base_price ?? 0);
  const qty = plan === "plan_2" ? 2 : 3;
  const depositAmount = price * qty;
  const defaultAddressId = addresses[0]?.id ?? null;

  async function submit() {
    setLoading(true);
    try {
      const { data: sub, error } = await supabase.rpc("create_subscription_with_cylinders", {
        p_customer_id: user!.id,
        p_plan: plan,
        p_cylinder_size: size,
        p_usage_frequency_days: freq,
        p_deposit_amount: depositAmount,
        p_address_id: defaultAddressId,
      });
      if (error) throw error;

      // Initial delivery order, paid upfront like any refill.
      await supabase.from("orders").insert({
        customer_id: user!.id,
        cylinder_size: size,
        qty,
        address_id: defaultAddressId,
        address_snapshot:
          addresses[0]?.formatted_address ?? "Address to confirm — please update in profile",
        subtotal: price * qty,
        total: price * qty,
        payment_status: "mock_paid",
        subscription_id: (sub as any).id,
        notes: "Initial subscription delivery",
        eta: new Date(Date.now() + 24 * 3600_000).toISOString(),
      });
      toast.success(
        "Subscription started! Your exclusive cylinders are reserved and the initial delivery is on its way.",
      );
      navigate({ to: "/app/subscription" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not start subscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app/subscription" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Choose a plan</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["plan_2", "plan_3"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={`rounded-2xl border p-4 text-left transition-all ${plan === p ? "border-accent bg-accent/10" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-muted-foreground">
                {p === "plan_2" ? "2-cyl" : "3-cyl"}
              </span>
              {plan === p && (
                <div className="grid h-5 w-5 place-items-center rounded-full zap-accent-gradient">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>
            <p className="mt-1 font-bold">{p === "plan_2" ? "2 cylinders" : "3 cylinders"}</p>
            <p className="text-xs text-muted-foreground">
              Ideal for {p === "plan_2" ? "small households" : "families & small businesses"}
            </p>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-medium">Cylinder size</p>
          <div className="grid grid-cols-3 gap-2">
            {sizes.map((s) => (
              <button
                key={s.size}
                onClick={() => setSize(s.size as any)}
                className={`rounded-xl border p-3 text-center text-sm ${size === s.size ? "border-accent bg-accent/10 font-semibold" : ""}`}
              >
                {s.label.replace(" Cylinder", "")}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Refill every</Label>
            <div className="grid grid-cols-4 gap-2">
              {[14, 21, 30, 45].map((n) => (
                <button
                  key={n}
                  onClick={() => setFreq(n)}
                  className={`rounded-xl border p-2 text-sm ${freq === n ? "border-accent bg-accent/10 font-semibold" : ""}`}
                >
                  {n}d
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
            <div>
              <p className="font-semibold">
                {qty} exclusive {CYLINDER_LABEL[size]} cylinder{qty > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                These are reserved just for you and swapped empty-for-full on every refill. A
                one-time deposit covers them.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span>One-time deposit</span>
              <strong>{zar(depositAmount)}</strong>
            </div>
            <p className="text-xs text-muted-foreground">
              Refills are billed upfront each time, just like a normal order — no recurring card
              charges yet.
            </p>
          </div>

          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? "Reserving cylinders…" : `Pay deposit & start subscription`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
