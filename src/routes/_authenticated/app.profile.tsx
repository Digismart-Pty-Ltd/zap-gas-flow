import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useMyRoles } from "@/hooks/use-session";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Plus, Trash2, MessageSquare, Shield, Truck } from "lucide-react";
import { toast } from "sonner";
import { grantMyselfRole } from "@/lib/dev-roles.functions";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: Profile,
});

function Profile() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newAddr, setNewAddr] = useState("");
  const [msg, setMsg] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (data) { setName(data.full_name ?? ""); setPhone(data.phone ?? ""); }
      return data;
    },
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").eq("user_id", user!.id)).data ?? [],
  });

  async function saveProfile() {
    const { error } = await supabase.from("profiles").upsert({ id: user!.id, full_name: name, phone });
    if (error) toast.error(error.message); else toast.success("Profile updated");
  }
  async function addAddress() {
    if (!newAddr.trim()) return;
    const { error } = await supabase.from("addresses").insert({ user_id: user!.id, formatted_address: newAddr.trim(), is_default: addresses.length === 0 });
    if (error) return toast.error(error.message);
    setNewAddr(""); qc.invalidateQueries({ queryKey: ["addresses", user?.id] });
  }
  async function delAddr(id: string) {
    await supabase.from("addresses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["addresses", user?.id] });
  }
  async function sendSupport() {
    if (!msg.trim()) return;
    await supabase.from("support_messages").insert({ user_id: user!.id, from_role: "customer", message: msg });
    setMsg(""); toast.success("Message sent to Zap Gas support");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Profile</h1>

      <Card><CardContent className="space-y-3 p-5">
        <p className="text-sm font-semibold">Personal details</p>
        <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <Button onClick={saveProfile}>Save</Button>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-5">
        <p className="text-sm font-semibold">Addresses</p>
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-xl border p-3">
            <MapPin className="mt-0.5 h-4 w-4 text-accent" />
            <p className="flex-1 text-sm">{a.formatted_address}{a.is_default && <span className="ml-2 text-xs text-success">Default</span>}</p>
            <Button variant="ghost" size="icon" onClick={() => delAddr(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input placeholder="Add new address" value={newAddr} onChange={(e) => setNewAddr(e.target.value)} />
          <Button size="icon" onClick={addAddress}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-5">
        <p className="text-sm font-semibold">Payments</p>
        <p className="text-xs text-muted-foreground">Payment methods are stubbed in this preview. Real card & EFT support will be added later.</p>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /><p className="text-sm font-semibold">Support</p></div>
        <Textarea placeholder="How can we help?" value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} />
        <div className="flex gap-2">
          <Button onClick={sendSupport} className="flex-1">Send message</Button>
          <a href="https://wa.me/27000000000" target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="outline" className="w-full">WhatsApp</Button>
          </a>
        </div>
      </CardContent></Card>
    </div>
  );
}
