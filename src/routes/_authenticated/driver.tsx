import { Outlet, createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Truck, LogOut, ClipboardList, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/driver")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", (context as any).user.id);
    const roles = (data ?? []).map((r) => r.role);
    if (!roles.includes("driver") && !roles.includes("admin")) {
      throw redirect({ to: "/app" });
    }
  },
  component: DriverShell,
});

function DriverShell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut(); navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-secondary/40 pb-20">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/driver" className="flex items-center gap-2 font-display font-bold">
            <div className="grid h-8 w-8 place-items-center rounded-lg zap-gradient"><Truck className="h-4 w-4 text-accent" /></div>
            Zap Gas · Driver
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-2xl grid-cols-2">
          <Link to="/driver" className="flex flex-col items-center gap-1 py-3 text-xs"><ClipboardList className="h-5 w-5" />Jobs</Link>
          <Link to="/driver/history" className="flex flex-col items-center gap-1 py-3 text-xs"><BarChart3 className="h-5 w-5" />History</Link>
        </div>
      </nav>
    </div>
  );
}
