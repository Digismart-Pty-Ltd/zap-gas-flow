import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Zap Gas" },
      { name: "description", content: "Sign in or create your Zap Gas account." },
    ],
  }),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const goNext = () => navigate({ to: search.redirect ?? "/app" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth/reset-password",
        });
        if (error) throw error;
        toast.success("If that email has an account, a reset link is on its way.");
        setMode("signin");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + "/app",
          },
        });
        if (error) throw error;
        if (!data.session) {
          // No session back means either email confirmation is pending, or
          // (for security) this email already exists and Supabase silently
          // no-ops instead of erroring — either way there's nothing to sign
          // in to yet.
          toast.success(
            "Check your email to confirm your account before signing in. If you already have an account with this email, sign in instead.",
          );
          setMode("signin");
          return;
        }
        toast.success("Account created! You're signed in.");
        goNext();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        goNext();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/app",
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      goNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <Logo className="h-12 w-12" withWordmark />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode !== "forgot" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={google}
                  disabled={loading}
                >
                  Continue with Google
                </Button>
                <div className="relative text-center text-xs text-muted-foreground">
                  <span className="relative z-10 bg-card px-2">or with email</span>
                  <div className="absolute left-0 top-1/2 h-px w-full bg-border" />
                </div>
              </>
            )}
            {mode === "forgot" && (
              <p className="text-sm text-muted-foreground">
                Enter the email on your account and we'll send you a link to reset your password.
              </p>
            )}
            <form className="space-y-3" onSubmit={submit}>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              )}
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-right text-xs font-medium text-primary hover:underline"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </button>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "signup" ? (
                  "Create account"
                ) : mode === "forgot" ? (
                  "Send reset link"
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
            <div className="text-center text-sm text-muted-foreground">
              {mode === "forgot" ? (
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </button>
              ) : mode === "signup" ? (
                <>
                  Have an account?{" "}
                  <button
                    className="font-medium text-primary hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button
                    className="font-medium text-primary hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Create an account
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
