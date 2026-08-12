import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Repeat, Calendar, ShieldCheck, Gift } from "lucide-react";
import { CYLINDER_LABEL, fmtDate, zar } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { user } = useCurrentUser();
  const { data: sub, refetch } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("subscriptions")
          .select("*")
          .eq("customer_id", user!.id)
          .eq("status", "active")
          .maybeSingle()
      ).data,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["subscription-cylinders", sub?.id],
    enabled: !!sub,
    queryFn: async () =>
      (await supabase.from("cylinder_assets").select("*").eq("subscription_id", sub!.id)).data ??
      [],
  });
  const { data: nextRefill } = useQuery({
    queryKey: ["subscription-next-refill", sub?.id],
    enabled: !!sub,
    queryFn: async () =>
      (
        await supabase
          .from("subscription_refills")
          .select("*")
          .eq("subscription_id", sub!.id)
          .eq("status", "scheduled")
          .order("scheduled_date", { ascending: true })
          .limit(1)
          .maybeSingle()
      ).data,
  });

  async function pause() {
    await supabase.from("subscriptions").update({ status: "paused" }).eq("id", sub!.id);
    toast.success("Subscription paused");
    refetch();
  }
  async function cancel() {
    await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", sub!.id);
    toast.success(
      "Subscription cancelled. Your exclusive cylinders will be collected on the next visit.",
    );
    refetch();
  }

  if (!sub) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Refill subscription</h1>
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/20">
              <Repeat className="h-6 w-6 text-accent-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Never run out of gas</h2>
            <p className="text-sm text-muted-foreground">
              Pick a plan of 2 or 3 cylinders. You get exclusive Zap Gas cylinders reserved just for
              you, and 9kg refills earn loyalty credit.
            </p>
            <Link to="/app/subscription/new">
              <Button className="w-full">Get started</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Refill subscription</h1>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">
                {sub.plan === "plan_2" ? "2-cylinder plan" : "3-cylinder plan"} ·{" "}
                {CYLINDER_LABEL[sub.cylinder_size]}
              </p>
            </div>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              Active
            </span>
          </div>
          <div className="grid gap-3 rounded-xl bg-secondary p-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Next refill:{" "}
                <strong>{fmtDate(nextRefill?.scheduled_date ?? sub.next_refill_date)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span>Usage: every {sub.usage_frequency_days} days</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span>
                Deposit: {zar(Number(sub.deposit_amount))} ·{" "}
                {sub.deposit_payment_status === "mock_paid" ? "paid" : sub.deposit_payment_status}
              </span>
            </div>
            {nextRefill?.free_cylinder_applied && (
              <div className="flex items-center gap-2 text-accent-foreground">
                <Gift className="h-4 w-4" />
                <span>Free cylinder reward applied to this refill</span>
              </div>
            )}
          </div>

          {assets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Your exclusive cylinders
              </p>
              <div className="grid gap-2">
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border p-2.5 text-sm"
                  >
                    <span className="font-mono">{a.asset_tag}</span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {a.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={pause} className="flex-1">
              Pause
            </Button>
            <Button variant="destructive" onClick={cancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
