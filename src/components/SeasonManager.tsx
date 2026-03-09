import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Archive, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function SeasonManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: seasons } = useQuery({
    queryKey: ["seasons", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("coach_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const activeSeason = seasons?.find((s: any) => s.is_active);

  const createSeason = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Season name required");
      // Deactivate current active season
      if (activeSeason) {
        await supabase
          .from("seasons")
          .update({ is_active: false, end_date: new Date().toISOString().split("T")[0] } as any)
          .eq("id", activeSeason.id);
      }
      const { error } = await supabase.from("seasons").insert({
        coach_id: user!.id,
        name: newName.trim(),
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      toast({ title: "New season started!", description: `"${newName}" is now the active season.` });
      setNewName("");
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const archiveSeason = useMutation({
    mutationFn: async (seasonId: string) => {
      const { error } = await supabase
        .from("seasons")
        .update({ is_active: false, end_date: new Date().toISOString().split("T")[0] } as any)
        .eq("id", seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      toast({ title: "Season archived" });
    },
  });

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Seasons</h3>
          {activeSeason && (
            <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
              <CheckCircle className="mr-1 h-3 w-3" />
              {(activeSeason as any).name}
            </Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              <Plus className="mr-1 h-3.5 w-3.5" />
              New Season
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-foreground">Start New Season</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {activeSeason
                ? `This will archive "${(activeSeason as any).name}" and start a new season. Previous data stays accessible in history.`
                : "Create your first season to organize results by time period."}
            </p>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. 2025-2026 Season"
              className="border-border bg-secondary text-foreground"
            />
            <Button
              onClick={() => createSeason.mutate()}
              disabled={!newName.trim() || createSeason.isPending}
              className="gradient-orange glow-orange text-primary-foreground"
            >
              {createSeason.isPending ? "Creating..." : "Start Season"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {seasons && seasons.length > 1 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">History</p>
          {seasons.filter((s: any) => !s.is_active).slice(0, 3).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">
                <Archive className="mr-1.5 inline h-3 w-3" />
                {s.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {s.start_date} → {s.end_date || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
