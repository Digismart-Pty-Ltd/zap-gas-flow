import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CYLINDER_LABEL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cylinders")({ component: Cylinders });

function Cylinders() {
  const qc = useQueryClient();
  const [tag, setTag] = useState("");
  const [size, setSize] = useState<"kg9" | "kg19" | "kg48">("kg9");
  const [saving, setSaving] = useState(false);

  const { data: assets = [] } = useQuery({
    queryKey: ["admin-cylinder-assets"],
    queryFn: async () =>
      (
        await supabase
          .from("cylinder_assets")
          .select("*, profiles!cylinder_assets_current_customer_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(300)
      ).data ?? [],
  });

  const stockCounts = assets.reduce((acc: Record<string, number>, a: any) => {
    if (a.status === "in_stock") acc[a.size] = (acc[a.size] ?? 0) + 1;
    return acc;
  }, {});

  async function addStock() {
    if (!tag.trim()) return toast.error("Enter an asset tag");
    setSaving(true);
    const { error } = await supabase
      .from("cylinder_assets")
      .insert({ asset_tag: tag.trim(), size, status: "in_stock" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setTag("");
    toast.success("Cylinder added to stock");
    qc.invalidateQueries({ queryKey: ["admin-cylinder-assets"] });
  }

  async function retire(id: string) {
    const { error } = await supabase
      .from("cylinder_assets")
      .update({ status: "retired", subscription_id: null, current_customer_id: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-cylinder-assets"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cylinder inventory</h1>
      <p className="text-sm text-muted-foreground">
        Exclusive cylinders reserved for subscribers. Non-subscriber orders use standard
        empty-for-full exchange and aren't tracked here.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {(["kg9", "kg19", "kg48"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{CYLINDER_LABEL[s]} in stock</p>
              <p className="mt-1 text-2xl font-bold">{stockCounts[s] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">Add cylinder to stock</p>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Asset tag e.g. ZG-000123"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="max-w-xs"
            />
            <Select value={size} onValueChange={(v) => setSize(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["kg9", "kg19", "kg48"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {CYLINDER_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addStock} disabled={saving}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.asset_tag}</TableCell>
                  <TableCell>{CYLINDER_LABEL[a.size]}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                      {a.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>{a.profiles?.full_name ?? "—"}</TableCell>
                  <TableCell>
                    {a.status !== "retired" && (
                      <Button size="sm" variant="ghost" onClick={() => retire(a.id)}>
                        Retire
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
