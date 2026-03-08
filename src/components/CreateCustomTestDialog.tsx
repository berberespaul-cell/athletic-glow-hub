import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const CATEGORY_OPTIONS = [
  { value: "strength", label: "Strength" },
  { value: "run", label: "Endurance / Run" },
  { value: "sprints", label: "Sprints" },
  { value: "weightlifting", label: "Weightlifting" },
  { value: "streetlifting", label: "Streetlifting" },
  { value: "jumps", label: "Jumps" },
  { value: "anthropometric", label: "Anthropometric" },
  { value: "change_of_direction", label: "Change of Direction" },
  { value: "vma", label: "VMA" },
];

const UNIT_OPTIONS = ["kg", "cm", "m", "sec", "min", "reps", "points", "km/h"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCustomTestDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("test_library").insert({
        name,
        family: family as any,
        unit,
        description: description || null,
        is_custom: true,
        created_by_user_id: user!.id,
        sports: ["rugby", "basketball", "volleyball", "hybrid"],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      toast({ title: "Custom test created!", description: `"${name}" is now available in your test library.` });
      setName("");
      setFamily("");
      setUnit("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Custom Test</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Test Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Hex Bar Deadlift" className="mt-1 border-border bg-secondary text-foreground" />
          </div>
          <div>
            <Label className="text-muted-foreground">Category *</Label>
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger className="mt-1 border-border bg-secondary text-foreground">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {CATEGORY_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-foreground">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">Unit *</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="mt-1 border-border bg-secondary text-foreground">
                <SelectValue placeholder="Select unit..." />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {UNIT_OPTIONS.map(u => (
                  <SelectItem key={u} value={u} className="text-foreground">{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Protocol details..." className="mt-1 border-border bg-secondary text-foreground" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name || !family || !unit}
            className="gradient-orange text-primary-foreground">
            {mutation.isPending ? "Creating..." : "Create Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
