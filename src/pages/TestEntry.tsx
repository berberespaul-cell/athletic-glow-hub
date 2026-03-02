import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTestsForSport, type SportType } from "@/lib/sportTests";
import { brzycki1RM, isStrengthTest, relativeForce } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Dumbbell } from "lucide-react";

export default function TestEntry() {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTestId, setSelectedTestId] = useState("");
  const [value, setValue] = useState("");
  const [reps, setReps] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [fatigue, setFatigue] = useState(4);
  const [sleep, setSleep] = useState(4);
  const [soreness, setSoreness] = useState(4);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: tests } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => {
      const { data } = await supabase.from("test_library").select("*");
      return data || [];
    },
  });

  const sport = (profile?.sport || "hybrid") as SportType;
  const filteredTests = tests?.filter(t => {
    const sportTests = getTestsForSport(sport);
    return sportTests.some(st => st.name === t.name);
  }) || [];

  const selectedTest = tests?.find(t => t.id === selectedTestId);
  const showReps = selectedTest && isStrengthTest(selectedTest.family);

  // Computed values
  const estimated1RM = showReps && value && reps && Number(reps) > 1
    ? brzycki1RM(Number(value), Number(reps))
    : null;
  const relForce = estimated1RM && profile?.weight_kg
    ? relativeForce(estimated1RM, Number(profile.weight_kg))
    : value && profile?.weight_kg && showReps && (!reps || Number(reps) === 1)
    ? relativeForce(Number(value), Number(profile.weight_kg))
    : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("results").insert({
        profile_id: profileId!,
        test_id: selectedTestId,
        session_date: sessionDate,
        value: Number(value),
        reps: reps ? Number(reps) : null,
        wellness_fatigue: fatigue,
        wellness_sleep: sleep,
        wellness_soreness: soreness,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-results"] });
      setSubmitted(true);
      toast({ title: "Result saved!", description: "Your test result has been recorded." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId || !value) return;
    mutation.mutate();
  };

  const handleReset = () => {
    setSelectedTestId("");
    setValue("");
    setReps("");
    setNotes("");
    setFatigue(4);
    setSleep(4);
    setSoreness(4);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Test Entry</h1>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card mx-auto max-w-lg rounded-2xl p-8 text-center"
        >
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-success" />
          <h2 className="text-xl font-bold text-foreground">Result Saved!</h2>
          <p className="mt-2 text-muted-foreground">
            {selectedTest?.name}: <span className="font-bold text-primary">{value} {selectedTest?.unit}</span>
          </p>
          {estimated1RM && (
            <p className="mt-1 text-muted-foreground">
              Estimated 1RM: <span className="font-bold text-primary">{estimated1RM} kg</span>
            </p>
          )}
          {relForce && (
            <p className="mt-1 text-muted-foreground">
              Relative Force: <span className="font-bold text-primary">{relForce}x BW</span>
            </p>
          )}
          <Button onClick={handleReset} className="gradient-orange mt-6 text-primary-foreground">
            Record Another Test
          </Button>
        </motion.div>
      </div>
    );
  }

  // Group tests by family
  const testsByFamily: Record<string, typeof filteredTests> = {};
  filteredTests.forEach(t => {
    const fam = t.family;
    if (!testsByFamily[fam]) testsByFamily[fam] = [];
    testsByFamily[fam].push(t);
  });

  const wellnessLabels = ["Very Poor", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Test Entry</h1>
        <p className="mt-1 text-muted-foreground">
          Record a new test result • Battery: <span className="capitalize text-primary">{sport}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Test Selection & Value */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card space-y-5 rounded-2xl p-6"
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Dumbbell className="h-5 w-5 text-primary" /> Test Details
          </h3>

          <div>
            <Label className="text-muted-foreground">Select Test</Label>
            <Select value={selectedTestId} onValueChange={setSelectedTestId}>
              <SelectTrigger className="mt-1 border-border bg-secondary text-foreground">
                <SelectValue placeholder="Choose a test..." />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {Object.entries(testsByFamily).map(([family, famTests]) => (
                  <div key={family}>
                    <div className="px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                      {family.replace(/_/g, " ")}
                    </div>
                    {famTests.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-foreground">
                        {t.name} ({t.unit})
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {selectedTest?.description && (
              <p className="mt-2 text-xs text-muted-foreground">{selectedTest.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Value ({selectedTest?.unit || "—"})</Label>
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                required
                className="mt-1 border-border bg-secondary text-foreground"
              />
            </div>
            {showReps && (
              <div>
                <Label className="text-muted-foreground">Reps (for 1RM est.)</Label>
                <Input
                  type="number"
                  min="1"
                  max="36"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="1"
                  className="mt-1 border-border bg-secondary text-foreground"
                />
              </div>
            )}
          </div>

          {estimated1RM && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">Estimated 1RM (Brzycki)</p>
              <p className="text-2xl font-bold text-primary">{estimated1RM} kg</p>
              {relForce && (
                <p className="text-sm text-muted-foreground">Relative: <span className="text-primary">{relForce}x BW</span></p>
              )}
            </div>
          )}

          <div>
            <Label className="text-muted-foreground">Session Date</Label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="mt-1 border-border bg-secondary text-foreground"
            />
          </div>

          <div>
            <Label className="text-muted-foreground">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations..."
              className="mt-1 border-border bg-secondary text-foreground"
            />
          </div>
        </motion.div>

        {/* Right: Wellness */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card space-y-6 rounded-2xl p-6"
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-primary" /> Wellness Check-in
          </h3>

          {[
            { label: "Fatigue Level", value: fatigue, setter: setFatigue, desc: "1 = exhausted → 6 = fully rested" },
            { label: "Sleep Quality", value: sleep, setter: setSleep, desc: "1 = terrible → 6 = excellent" },
            { label: "Muscle Soreness", value: soreness, setter: setSoreness, desc: "1 = very sore → 6 = no soreness" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">{item.label}</Label>
                <span className="text-sm font-bold text-primary">
                  {item.value} — {wellnessLabels[item.value - 1]}
                </span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{item.desc}</p>
              <Slider
                value={[item.value]}
                onValueChange={([v]) => item.setter(v)}
                min={1}
                max={6}
                step={1}
                className="mt-1"
              />
            </div>
          ))}

          <div className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">Wellness Score</p>
            <p className="text-3xl font-bold text-foreground">
              {((fatigue + sleep + soreness) / 3).toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">/6.0</p>
          </div>

          <Button
            type="submit"
            className="gradient-orange glow-orange w-full text-primary-foreground"
            disabled={!selectedTestId || !value || mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save Result"}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
