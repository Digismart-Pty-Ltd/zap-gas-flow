import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Flame, Truck, Repeat, Gift, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Zap Gas — Gas delivered to your door in the West Rand" },
      { name: "description", content: "Order 9kg, 19kg or 48kg gas cylinders on-demand across the West Rand. Subscribe for auto refills. Every 10th cylinder free." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <div className="grid h-9 w-9 place-items-center rounded-lg zap-accent-gradient">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            Zap Gas
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" } as never}><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 zap-gradient opacity-[0.04]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <MapPin className="h-3.5 w-3.5" /> Serving the West Rand, Johannesburg
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
              Gas delivered.<br />
              <span className="bg-clip-text text-transparent zap-accent-gradient">Zapped to your door.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Order 9kg, 19kg or 48kg cylinders on demand. Subscribe for automatic refills.
              Every 10th cylinder is on us.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="h-12 px-6 text-base">Order gas now</Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="h-12 px-6 text-base">I have an account</Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Certified handlers</span>
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-success" /> 24-hour delivery</span>
            </div>
          </div>
          <div className="relative">
            <div className="mx-auto grid max-w-md gap-4">
              <FeatureCard icon={Truck} title="On-demand delivery" desc="Confirm your order and get gas within 24 hours. Need it faster? Request an urgent slot." />
              <FeatureCard icon={Repeat} title="Auto refills" desc="Pick a 2 or 3-cylinder plan. We predict when you'll run out and refill before it happens." />
              <FeatureCard icon={Gift} title="10th cylinder free" desc="Every cylinder you buy earns a credit. Hit 10 and your next one is free — automatically." />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-secondary/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">How Zap Gas works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Choose your cylinder", d: "9kg, 19kg or 48kg — for the braai, the kitchen, or the business." },
              { n: "02", t: "Track in real time", d: "See your driver's status and ETA. Get notified at every step." },
              { n: "03", t: "Sign & swap", d: "Your empty is picked up. Full cylinder handed over. Digital proof of delivery." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border bg-card p-6">
                <div className="font-display text-3xl font-bold text-accent">{s.n}</div>
                <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border zap-gradient p-10 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold md:text-4xl">Ready when you are.</h2>
          <p className="mt-3 text-primary-foreground/80">Create your account, add your address and place your first order in under a minute.</p>
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button size="lg" variant="secondary" className="mt-6 h-12 px-6 text-base">Create free account</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Zap Gas · West Rand, Johannesburg
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof Truck; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
}
