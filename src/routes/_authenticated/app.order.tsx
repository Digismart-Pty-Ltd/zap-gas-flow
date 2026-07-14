import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Check, CreditCard, ArrowLeft, Gift } from "lucide-react";
import { zar, CYLINDER_LABEL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/order")({
  component: NewOrder,
});

type Step = "size" | "address" | "review";

function NewOrder() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("size");
  const [size, setSize] = useState<"kg9" | "kg19" | "kg48">("kg19");
  const [qty, setQty] = useState(1);
  const [urgent, setUrgent] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  const { data: sizes = [] } = useQuery({
    queryKey: ["cyl-sizes"],
    queryFn: async () => (await supabase.from("cylinder_sizes").select("*")).data ?? [],
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").eq("user_id", user!.id).order("is_default", { ascending: false })).data ?? [],
  });

  const { data: loyalty } = useQuery({
    queryKey: ["loyalty", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("loyalty_credits").select("*").eq("customer_id", user!.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (!addressId && addresses.length) setAddressId(addresses[0].id);
  }, [addresses, addressId]);

  const price = sizes.find((s) => s.size === size)?.base_price ?? 0;
  const rewardEligible = (loyalty?.credits ?? 0) >= 10 || (loyalty?.credits ?? 0) === 0 && (loyalty?.lifetime_earned ?? 0) > 0 && (loyalty?.lifetime_earned ?? 0) % 10 === 0;
  // simpler: eligible if credits are exactly 0 after just hitting 10 — track via credits==0 with lifetime>0.
  // We'll show a toggle: if user has an unlocked free cylinder (a redeem-ready flag), allow apply.
  // Simplification: reward is applied if user opts in AND credits==0 AND lifetime>0 AND divisible.
  const [applyReward, setApplyReward] = useState(false);
  const canApplyReward = rewardEligible;
  const urgentFee = urgent ? 75 : 0;
  const subtotal = Number(price) * qty;
  const total = applyReward && canApplyReward ? Math.max(0, subtotal - Number(price)) + urgentFee : subtotal + urgentFee;

  async function ensureAddress(): Promise<string | null> {
    if (addressId) return addressId;
    if (newAddr.trim().length < 5) { toast.error("Please enter a delivery address"); return null; }
    const { data, error } = await supabase.from("addresses").insert({
      user_id: user!.id, formatted_address: newAddr.trim(), is_default: addresses.length === 0,
    }).select("*").single();
    if (error) { toast.error(error.message); return null; }
    return data.id;
  }

  async function place() {
    setPlacing(true);
    try {
      const aid = await ensureAddress();
      if (!aid) return;
      const addr = addresses.find((a) => a.id === aid) ?? { formatted_address: newAddr, lat: null, lng: null };
      const { data, error } = await supabase.from("orders").insert({
        customer_id: user!.id,
        cylinder_size: size, qty, address_id: aid,
        address_snapshot: (addr as any).formatted_address ?? newAddr,
        lat: (addr as any).lat, lng: (addr as any).lng,
        urgent, notes: notes || null,
        subtotal, total,
        loyalty_applied: applyReward && canApplyReward,
        payment_status: "mock_paid",
        eta: new Date(Date.now() + (urgent ? 4 : 24) * 3600_000).toISOString(),
      }).select("*").single();
      if (error) throw error;
      toast.success("Order placed! We'll notify you as it moves.");
      navigate({ to: "/app/order/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not place order");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app" })}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">New order</h1>
      </div>

      <Stepper step={step} />

      {step === "size" && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium">Choose cylinder size</p>
            <div className="grid gap-3">
              {sizes.map((s) => (
                <button
                  key={s.size}
                  onClick={() => setSize(s.size as any)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${size === s.size ? "border-accent bg-accent/10" : "hover:bg-secondary"}`}
                >
                  <div>
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{zar(Number(s.base_price))}</p>
                  </div>
                  {size === s.size && <div className="grid h-6 w-6 place-items-center rounded-full zap-accent-gradient"><Check className="h-4 w-4 text-primary" /></div>}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <p className="text-sm font-medium">Quantity</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</Button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <Button variant="outline" size="icon" onClick={() => setQty((q) => Math.min(10, q + 1))}>+</Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Urgent delivery</p>
                <p className="text-xs text-muted-foreground">Get it within ~4 hours (+ {zar(75)})</p>
              </div>
              <Switch checked={urgent} onCheckedChange={setUrgent} />
            </div>

            <Button className="w-full" onClick={() => setStep("address")}>Continue</Button>
          </CardContent>
        </Card>
      )}

      {step === "address" && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium">Delivery address</p>
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <button key={a.id} onClick={() => setAddressId(a.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${addressId === a.id ? "border-accent bg-accent/10" : ""}`}>
                    <MapPin className="mt-0.5 h-4 w-4 text-accent" />
                    <div className="flex-1">
                      {a.label && <p className="text-sm font-medium">{a.label}</p>}
                      <p className="text-sm text-muted-foreground">{a.formatted_address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="addr">Or enter a new address</Label>
              <Textarea id="addr" placeholder="Street, suburb, West Rand" value={newAddr} onChange={(e) => { setNewAddr(e.target.value); setAddressId(null); }} rows={2} />
              <p className="text-xs text-muted-foreground">We currently serve the West Rand, Johannesburg only.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Delivery notes (optional)</Label>
              <Textarea id="notes" placeholder="Complex code, best time, etc." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("size")} className="flex-1">Back</Button>
              <Button onClick={() => setStep("review")} className="flex-1">Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Order</p>
              <p className="font-semibold">{CYLINDER_LABEL[size]} × {qty}</p>
              {urgent && <p className="text-xs text-warning-foreground">Urgent delivery</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivering to</p>
              <p className="text-sm">{addressId ? addresses.find((a) => a.id === addressId)?.formatted_address : newAddr}</p>
            </div>

            {canApplyReward && (
              <label className="flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/10 p-3">
                <Gift className="h-5 w-5 text-accent-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Use your free cylinder reward</p>
                  <p className="text-xs text-muted-foreground">One {CYLINDER_LABEL[size]} on us</p>
                </div>
                <Switch checked={applyReward} onCheckedChange={setApplyReward} />
              </label>
            )}

            <div className="space-y-1 rounded-xl bg-secondary p-3 text-sm">
              <Row label="Subtotal" value={zar(subtotal)} />
              {urgentFee > 0 && <Row label="Urgent fee" value={zar(urgentFee)} />}
              {applyReward && canApplyReward && <Row label="Loyalty reward" value={`- ${zar(Number(price))}`} />}
              <div className="border-t pt-1"><Row label="Total" value={zar(total)} bold /></div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border p-3 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Payments are stubbed for this preview
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("address")} className="flex-1">Back</Button>
              <Button onClick={place} disabled={placing} className="flex-1">
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place order"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ["size", "address", "review"];
  const i = steps.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, idx) => (
        <div key={s} className={`h-1.5 flex-1 rounded-full ${idx <= i ? "bg-accent" : "bg-secondary"}`} />
      ))}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-bold" : ""}`}><span>{label}</span><span>{value}</span></div>;
}
