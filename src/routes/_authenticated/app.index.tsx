import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Truck, Repeat, Gift, ArrowRight, MapPin } from "lucide-react";
import { CYLINDER_LABEL, fmtDate, ORDER_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Home,
});

function Home() {
  const { user } = useCurrentUser();

  const { data: loyalty } = useQuery({
    queryKey: ["loyalty", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("loyalty_credits").select("*").eq("customer_id", user!.id).maybeSingle();
      return data ?? { credits: 0, lifetime_earned: 0, free_cylinders_redeemed: 0 };
    },
  });

  const { data: activeOrder } = useQuery({
    queryKey: ["active-order", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*")
        .eq("customer_id", user!.id).not("status","in","(delivered,cancelled)")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*").eq("customer_id", user!.id).eq("status","active").maybeSingle();
      return data;
    },
  });

  const credits = loyalty?.credits ?? 0;
  const progress = Math.min(100, (credits / 10) * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border zap-gradient p-5 text-primary-foreground shadow-glow">
        <p className="text-sm text-primary-foreground/70">Welcome back</p>
        <h1 className="mt-0.5 text-2xl font-bold">Need gas today?</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">Order in under a minute. Delivered within 24 hours across the West Rand.</p>
        <Link to="/app/order"><Button size="lg" variant="secondary" className="mt-4 w-full">
          <Flame className="mr-2 h-5 w-5" /> Order gas now
        </Button></Link>
      </div>

      {activeOrder && (
        <Link to="/app/order/$id" params={{ id: activeOrder.id }}>
          <Card className="border-accent/40">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/20 text-accent-foreground">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Active order</p>
                <p className="truncate font-semibold">{CYLINDER_LABEL[activeOrder.cylinder_size]} × {activeOrder.qty}</p>
                <p className="text-sm text-muted-foreground">{ORDER_STATUS_LABEL[activeOrder.status]}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/20"><Gift className="h-4 w-4 text-accent-foreground" /></div>
              <div>
                <p className="text-sm font-semibold">Loyalty rewards</p>
                <p className="text-xs text-muted-foreground">{credits}/10 cylinders — {10 - credits} to your free cylinder</p>
              </div>
            </div>
            <Link to="/app/loyalty" className="text-xs font-medium text-primary hover:underline">View</Link>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full zap-accent-gradient transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <Link to="/app/subscription">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-secondary"><Repeat className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              {subscription ? (
                <>
                  <p className="text-sm font-semibold">{subscription.plan === "plan_2" ? "2-cylinder plan" : "3-cylinder plan"}</p>
                  <p className="text-xs text-muted-foreground">Next refill: {fmtDate(subscription.next_refill_date)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">Subscribe for auto refills</p>
                  <p className="text-xs text-muted-foreground">Never run out. Cancel anytime.</p>
                </>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <div className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 text-accent" />
        Serving the West Rand, Johannesburg — 24-hour delivery
      </div>
    </div>
  );
}
