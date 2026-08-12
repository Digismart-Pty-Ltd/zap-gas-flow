import { Outlet, createFileRoute, Link, useNavigate, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, SidebarHeader,
} from "@/components/ui/sidebar";
import { LayoutDashboard, ShoppingBag, Repeat, Users, Truck, Gift, MessageSquare, LogOut, Flame, PackageSearch, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", (context as any).user.id);
    const roles = (data ?? []).map((r) => r.role);
    if (!roles.includes("admin")) throw redirect({ to: "/app" });
  },
  component: AdminShell,
});

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/admin/refills", label: "Refills", icon: CalendarClock },
  { to: "/admin/cylinders", label: "Cylinders", icon: PackageSearch },
  { to: "/admin/drivers", label: "Drivers", icon: Truck },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/loyalty", label: "Loyalty", icon: Gift },
  { to: "/admin/support", label: "Support", icon: MessageSquare },
];

function AdminShell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut(); navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2 font-display font-bold text-sidebar-foreground">
              <div className="grid h-8 w-8 place-items-center rounded-lg zap-accent-gradient"><Flame className="h-4 w-4 text-primary" /></div>
              <span className="group-data-[collapsible=icon]:hidden">Zap Gas Admin</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup><SidebarGroupContent><SidebarMenu>
              {items.map((it) => {
                const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.to}><it.icon className="h-4 w-4" /><span>{it.label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu></SidebarGroupContent></SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="flex h-12 items-center border-b px-3">
            <SidebarTrigger />
            <div className="ml-auto"><Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button></div>
          </header>
          <main className="flex-1 p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
