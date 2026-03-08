import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: any;
  unit: string;
  showWellness?: boolean;
}

export default function EditResultDialog({ open, onOpenChange, result, unit, showWellness }: Props) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(result.value));
  const [reps, setReps] = useState(String(result.reps ?? ""));
  const [sessionDate, setSessionDate] = useState(result.session_date);
  const [fatigue, setFatigue] = useState(result.wellness_fatigue ?? 4);
  const [sleep, setSleep] = useState(result.wellness_sleep ?? 4);
  const [soreness, setSoreness] = useState(result.wellness_soreness ?? 4);
  const [notes, setNotes] = useState(result.notes ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const update: Record<string, any> = {
        value: Number(value),
        session_date: sessionDate,
        reps: reps ? Number(reps) : null,
        notes: notes || null,
      };
      if (showWellness) {
        update.wellness_fatigue = fatigue;
        update.wellness_sleep = sleep;
        update.wellness_soreness = soreness;
      }
      const { error } = await supabase.from("results").update(update as any).eq("id", result.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-results"] });
      queryClient.invalidateQueries({ queryKey: ["all-results"] });
      queryClient.invalidateQueries({ queryKey: ["all-results-dash"] });
      queryClient.invalidateQueries({ queryKey: ["athlete-results"] });
      toast({ title: "Result updated!" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const wellnessLabels = ["Very Poor", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Result</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Value ({unit})</Label>
              <Input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)}
                className="mt-1 border-border bg-secondary text-foreground" />
            </div>
            <div>
              <Label className="text-muted-foreground">Reps</Label>
              <Input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)}
                placeholder="1" className="mt-1 border-border bg-secondary text-foreground" />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Date</Label>
            <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
              className="mt-1 border-border bg-secondary text-foreground" />
          </div>
          <div>
            <Label className="text-muted-foreground">Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..." className="mt-1 border-border bg-secondary text-foreground" />
          </div>
          {showWellness && (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-sm font-semibold text-foreground">Wellness</p>
              {[
                { label: "Fatigue", val: fatigue, set: setFatigue },
                { label: "Sleep", val: sleep, set: setSleep },
                { label: "Soreness", val: soreness, set: setSoreness },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.label}</span>
                    <span className="text-primary">{item.val}/6 — {wellnessLabels[item.val - 1]}</span>
                  </div>
                  <Slider min={1} max={6} step={1} value={[item.val]}
                    onValueChange={([v]) => item.set(v)} className="mt-1" />
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !value}
            className="gradient-orange text-primary-foreground">
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
