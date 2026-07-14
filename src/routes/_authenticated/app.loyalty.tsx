import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, TrendingUp, Star } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/loyalty")({
  component: Loyalty,
});

function Loyalty() {
  const { user } = useCurrentUser();
  const { data: l } = useQuery({
    queryKey: ["loyalty", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("loyalty_credits").select("*").eq("customer_id", user!.id).maybeSingle()).data,
  });
  const { data: events = [] } = useQuery({
    queryKey: ["loyalty-events", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("loyalty_events").select("*").eq("customer_id", user!.id).order("created_at", { ascending: false }).limit(30)).data ?? [],
  });
  const credits = l?.credits ?? 0;
  const progress = Math.min(100, (credits / 10) * 100);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Loyalty rewards</h1>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full zap-accent-gradient">
              <Gift className="h-7 w-7 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold">{credits}/10</p>
            <p className="text-sm text-muted-foreground">{10 - credits} cylinder{10 - credits === 1 ? "" : "s"} to your free reward</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div className="h-full zap-accent-gradient transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4" /><span className="text-xs">Lifetime earned</span></div>
          <p className="mt-1 text-2xl font-bold">{l?.lifetime_earned ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4" /><span className="text-xs">Free cylinders</span></div>
          <p className="mt-1 text-2xl font-bold">{l?.free_cylinders_redeemed ?? 0}</p>
        </CardContent></Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Activity</h2>
        <div className="space-y-2">
          {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet — place your first order to start earning.</p>}
          {events.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{e.type === "earn" ? `+${e.amount} credit${e.amount === 1 ? "" : "s"}` : `Free cylinder redeemed`}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</p>
                </div>
                <Gift className={`h-4 w-4 ${e.type === "redeem" ? "text-accent" : "text-muted-foreground"}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
