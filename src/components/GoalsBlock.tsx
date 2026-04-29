import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { z } from "zod";
import { Plus, Target, Trophy, CalendarIcon, Trash2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { isLowerBetter } from "@/lib/calculations";

interface Props {
  profileId: string;
}

interface Goal {
  id: string;
  profile_id: string;
  test_id: string;
  target_value: number;
  target_date: string;
  notes: string | null;
  achieved: boolean;
  achieved_at: string | null;
  created_at: string;
}

const goalSchema = z.object({
  test_id: z.string().uuid({ message: "Please select a test" }),
  target_value: z.number().positive({ message: "Target must be greater than 0" }).max(100000),
  target_date: z.date({ required_error: "Please pick a target date" }),
  notes: z.string().trim().max(280).optional(),
});

export default function GoalsBlock({ profileId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [testId, setTestId] = useState<string>("");
  const [targetValue, setTargetValue] = useState<string>("");
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState<string>("");

  // Tests
  const { data: tests } = useQuery({
    queryKey: ["test-library-goals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("test_library")
        .select("id, name, unit, family")
        .order("name");
      return data || [];
    },
  });

  // Athlete results — to compute current best per test
  const { data: results } = useQuery({
    queryKey: ["goals-results", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("results")
        .select("test_id, value, session_date")
        .eq("profile_id", profileId);
      return data || [];
    },
    enabled: !!profileId,
  });

  // Goals
  const { data: goals } = useQuery({
    queryKey: ["athlete-goals", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("athlete_goals")
        .select("*")
        .eq("profile_id", profileId)
        .order("target_date", { ascending: true });
      return (data || []) as Goal[];
    },
    enabled: !!profileId,
  });

  const selectedTest = tests?.find((t) => t.id === testId);

  const createGoal = useMutation({
    mutationFn: async () => {
      const parsed = goalSchema.safeParse({
        test_id: testId,
        target_value: parseFloat(targetValue),
        target_date: targetDate,
        notes: notes || undefined,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0].message);
      }
      const { error } = await supabase.from("athlete_goals").insert({
        profile_id: profileId,
        test_id: parsed.data.test_id,
        target_value: parsed.data.target_value,
        target_date: format(parsed.data.target_date, "yyyy-MM-dd"),
        notes: parsed.data.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athlete-goals", profileId] });
      toast({ title: "Goal set!", description: "Your new goal is live." });
      setOpen(false);
      setTestId("");
      setTargetValue("");
      setTargetDate(undefined);
      setNotes("");
    },
    onError: (e: any) => toast({ title: "Could not set goal", description: e.message, variant: "destructive" }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("athlete_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["athlete-goals", profileId] }),
  });

  const markAchieved = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("athlete_goals")
        .update({ achieved: true, achieved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["athlete-goals", profileId] }),
  });

  // Build per-test best (respecting lower-is-better)
  const bestByTest = useMemo(() => {
    const map = new Map<string, number>();
    if (!results || !tests) return map;
    const familyByTest = new Map(tests.map((t) => [t.id, t.family as string]));
    results.forEach((r) => {
      const fam = familyByTest.get(r.test_id) || "";
      const lower = isLowerBetter(fam);
      const v = Number(r.value);
      const cur = map.get(r.test_id);
      if (cur === undefined) map.set(r.test_id, v);
      else map.set(r.test_id, lower ? Math.min(cur, v) : Math.max(cur, v));
    });
    return map;
  }, [results, tests]);

  // Auto-detect achievements (client-side; fires once per render when condition met)
  useMemo(() => {
    if (!goals || !tests) return;
    const familyByTest = new Map(tests.map((t) => [t.id, t.family as string]));
    goals.forEach((g) => {
      if (g.achieved) return;
      const best = bestByTest.get(g.test_id);
      if (best === undefined) return;
      const lower = isLowerBetter(familyByTest.get(g.test_id) || "");
      const reached = lower ? best <= g.target_value : best >= g.target_value;
      if (reached) {
        markAchieved.mutate(g.id);
        toast({
          title: "🎉 Goal achieved!",
          description: `You hit your target on ${tests.find((t) => t.id === g.test_id)?.name}. Congratulations!`,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, bestByTest, tests]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = (goals || []).map((g) => {
    const test = tests?.find((t) => t.id === g.test_id);
    const best = bestByTest.get(g.test_id);
    const lower = isLowerBetter(test?.family || "");
    const targetDateObj = new Date(g.target_date);
    const daysLeft = Math.ceil((targetDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((targetDateObj.getTime() - new Date(g.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const elapsed = totalDays - daysLeft;
    const timeProgress = totalDays > 0 ? Math.min(1, Math.max(0, elapsed / totalDays)) : 1;

    let progressPct = 0;
    if (best !== undefined) {
      if (lower) {
        // closer to target (smaller) is better; assume baseline = first ever value (or 1.5x target)
        const baseline = best > g.target_value ? best : g.target_value * 1.5;
        const range = baseline - g.target_value;
        progressPct = range > 0 ? Math.min(100, Math.max(0, ((baseline - best) / range) * 100)) : 100;
      } else {
        progressPct = Math.min(100, Math.max(0, (best / g.target_value) * 100));
      }
    }

    let status: "on-track" | "behind" | "expired" | "achieved" = "on-track";
    if (g.achieved) status = "achieved";
    else if (daysLeft < 0) status = "expired";
    else if (progressPct / 100 < timeProgress - 0.1) status = "behind";

    return {
      ...g,
      test,
      best,
      daysLeft,
      progressPct,
      status,
    };
  });

  const active = enriched.filter((g) => !g.achieved);
  const completed = enriched.filter((g) => g.achieved);

  const visibleActive = showAll ? active : active.slice(0, 3);

  const statusColor = (s: string) => {
    switch (s) {
      case "expired":
        return "text-destructive";
      case "behind":
        return "text-primary";
      case "achieved":
        return "text-success";
      default:
        return "text-success";
    }
  };

  const barColor = (s: string) => {
    switch (s) {
      case "expired":
        return "bg-destructive";
      case "behind":
        return "bg-primary";
      case "achieved":
        return "bg-success";
      default:
        return "bg-success";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header / Set Goal button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Personal Goals</h2>
          {active.length > 0 && (
            <span className="text-xs text-muted-foreground">{active.length} active</span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Set Goal
        </Button>
      </div>

      {/* Active goals */}
      {visibleActive.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {visibleActive.map((g) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="glass-card rounded-xl p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground truncate">
                        {g.test?.name || "Test"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {g.best !== undefined ? `${g.best}` : "—"} {g.test?.unit} → {g.target_value} {g.test?.unit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className={cn("h-full transition-all", barColor(g.status))}
                        style={{ width: `${g.progressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-semibold", statusColor(g.status))}>
                      {g.status === "expired"
                        ? "Past due"
                        : g.daysLeft === 0
                        ? "Today"
                        : `${g.daysLeft}d left`}
                    </p>
                    <button
                      onClick={() => deleteGoal.mutate(g.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3 w-3 inline" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {active.length > 3 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> View all ({active.length})
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && completed.length === 0 && (
        <div className="glass-card rounded-xl p-4 text-center text-xs text-muted-foreground">
          Set a goal to track your progress towards a target.
        </div>
      )}

      {/* Completed section */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trophy className="h-3.5 w-3.5 text-success" />
            Completed ({completed.length})
            {showCompleted ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2 space-y-1.5"
              >
                {completed.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="text-foreground truncate">{g.test?.name}</span>
                      <span className="text-muted-foreground">
                        {g.target_value} {g.test?.unit}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteGoal.mutate(g.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Set Goal Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Set a Personal Goal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test</Label>
              <Select value={testId} onValueChange={(v) => { setTestId(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a test…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {tests?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target value {selectedTest && <span className="text-muted-foreground text-xs">({selectedTest.unit})</span>}</Label>
              <Input
                type="number"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={selectedTest ? `e.g. 75 ${selectedTest.unit}` : "Enter a value"}
              />
            </div>

            <div className="space-y-2">
              <Label>Target date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !targetDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    disabled={(d) => d < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 280))}
                placeholder="What does this goal mean to you?"
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createGoal.mutate()}
              disabled={createGoal.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createGoal.isPending ? "Saving…" : "Save Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
