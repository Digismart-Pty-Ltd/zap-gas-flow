import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, Repeat, Gift, User } from "lucide-react";

const items: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/orders", label: "Orders", icon: ShoppingBag },
  { to: "/app/subscription", label: "Refills", icon: Repeat },
  { to: "/app/loyalty", label: "Rewards", icon: Gift },
  { to: "/app/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          return (
            <Link key={it.to} to={it.to} className={`flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <it.icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
              <span className="text-[11px] font-medium">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
