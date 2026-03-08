import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTestsForSport, getRecommendedTestNames, FAMILY_LABELS, FAMILY_ORDER, type SportType, type TestFamily } from "@/lib/sportTests";
import { brzycki1RM, isStrengthTest, isStreetlifting, relativeForce, streetliftingRelativeStrength, cycleDayToPhase } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Dumbbell, ChevronDown, Library, Star, Plus } from "lucide-react";
import CreateCustomTestDialog from "@/components/CreateCustomTestDialog";

export default function TestEntry() {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTestId, setSelectedTestId] = useState("");
  const [value, setValue] = useState("");
  const [reps, setReps] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [fatigue, setFatigue] = useState(4);
  const [sleep, setSleep] = useState(4);
  const [soreness, setSoreness] = useState(4);
  const [periodPain, setPeriodPain] = useState(1);
  const [cycleDay, setCycleDay] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showAllTests, setShowAllTests] = useState(false);

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
  const profileSex = (profile as any)?.sex || "";
  const showCycleTracking = profileSex === "female" || profileSex === "other";
  const recommendedNames = getRecommendedTestNames(sport);
  const sportTests = getTestsForSport(sport);

  const recommendedTests = tests?.filter(t => recommendedNames.includes(t.name)) || [];
  const allSportTests = tests?.filter(t => {
    const st = sportTests.find(s => s.name === t.name);
    return st && !recommendedNames.includes(t.name);
  }) || [];

  const selectedTest = tests?.find(t => t.id === selectedTestId);
  const isStrength = selectedTest && isStrengthTest(selectedTest.family);
  const isStreet = selectedTest && isStreetlifting(selectedTest.family);
  const showReps = isStrength;

  const totalLoad = isStreet && value && profile?.weight_kg
    ? Number(profile.weight_kg) + Number(value) : null;
  const streetRelStrength = isStreet && value && profile?.weight_kg
    ? streetliftingRelativeStrength(Number(value), Number(profile.weight_kg)) : null;
  const estimated1RM = isStrength && !isStreet && value && reps && Number(reps) > 1
    ? brzycki1RM(Number(value), Number(reps)) : null;
  const is1RMDirect = isStrength && !isStreet && (!reps || Number(reps) === 1);
  const relForce = (estimated1RM || (is1RMDirect && value)) && profile?.weight_kg
    ? relativeForce(estimated1RM || Number(value), Number(profile.weight_kg)) : null;

  // Cycle day → phase calculation
  const cycleDayNum = cycleDay ? parseInt(cycleDay, 10) : null;
  const cyclePhase = useMemo(() => {
    if (!cycleDayNum || cycleDayNum < 1) return null;
    return cycleDayToPhase(cycleDayNum);
  }, [cycleDayNum]);

  const mutation = useMutation({
    mutationFn: async () => {
      const wellnessData = wellnessOpen ? {
        wellness_fatigue: fatigue,
        wellness_sleep: sleep,
        wellness_soreness: soreness,
        ...(showCycleTracking ? { wellness_period_pain: periodPain } : {}),
      } : {};
      const insertData: Record<string, any> = {
        profile_id: profileId!,
        test_id: selectedTestId,
        session_date: sessionDate,
        value: Number(value),
        reps: reps ? Number(reps) : null,
        ...wellnessData,
        notes: notes || null,
      };
      if (wellnessOpen && showCycleTracking && cycleDayNum && cycleDayNum >= 1) {
        insertData.cycle_day = cycleDayNum;
        insertData.menstrual_phase = cyclePhase?.phase || null;
      }
      const { error } = await supabase.from("results").insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-results"] });
      queryClient.invalidateQueries({ queryKey: ["all-results"] });
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
    setPeriodPain(1);
    setCycleDay("");
    setWellnessOpen(false);
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
          {isStreet && totalLoad && (
            <>
              <p className="mt-1 text-muted-foreground">
                Total Load (BW + Added): <span className="font-bold text-primary">{totalLoad.toFixed(1)} kg</span>
              </p>
              {streetRelStrength && (
                <p className="mt-1 text-muted-foreground">
                  Relative Strength: <span className="font-bold text-primary">{streetRelStrength}x BW</span>
                </p>
              )}
            </>
          )}
          {estimated1RM && (
            <p className="mt-1 text-muted-foreground">
              Est. 1RM (Brzycki): <span className="font-bold text-primary">{estimated1RM} kg</span>
            </p>
          )}
          {is1RMDirect && value && (
            <p className="mt-1 text-muted-foreground">
              True 1RM: <span className="font-bold text-primary">{value} kg</span>
            </p>
          )}
          {relForce && (
            <p className="mt-1 text-muted-foreground">
              Relative Force: <span className="font-bold text-primary">{relForce}x BW</span>
            </p>
          )}
          {cyclePhase && (
            <p className="mt-1 text-muted-foreground">
              Cycle: <span style={{ color: cyclePhase.color }} className="font-bold">{cyclePhase.label} — J{cycleDayNum}</span>
            </p>
          )}
          <Button onClick={handleReset} className="gradient-orange mt-6 text-primary-foreground">
            Record Another Test
          </Button>
        </motion.div>
      </div>
    );
  }

  const groupByFamily = (testList: typeof allSportTests) => {
    const grouped: Partial<Record<TestFamily, typeof allSportTests>> = {};
    testList.forEach(t => {
      const fam = t.family as TestFamily;
      if (!grouped[fam]) grouped[fam] = [];
      grouped[fam]!.push(t);
    });
    return grouped;
  };

  const recommendedByFamily = groupByFamily(recommendedTests);
  const allByFamily = groupByFamily(allSportTests);
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
              <SelectContent className="max-h-80 border-border bg-card">
                {recommendedTests.length > 0 && (
                  <>
                    <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold uppercase text-primary">
                      <Star className="h-3 w-3" /> Recommended Battery
                    </div>
                    {FAMILY_ORDER.filter(f => recommendedByFamily[f]?.length).map(family => (
                      <div key={`rec-${family}`}>
                        <div className="px-3 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground/60">
                          {FAMILY_LABELS[family]}
                        </div>
                        {recommendedByFamily[family]!.map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-foreground">
                            {t.name} ({t.unit})
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {showAllTests && Object.keys(allByFamily).length > 0 && (
                  <>
                    <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold uppercase text-muted-foreground">
                      <Library className="h-3 w-3" /> Full Library
                    </div>
                    {FAMILY_ORDER.filter(f => allByFamily[f]?.length).map(family => (
                      <div key={`all-${family}`}>
                        <div className="px-3 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground/60">
                          {FAMILY_LABELS[family]}
                        </div>
                        {allByFamily[family]!.map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-foreground">
                            {t.name} ({t.unit})
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {sport === 'hybrid' && (() => {
                  const allGrouped = groupByFamily(tests || []);
                  return FAMILY_ORDER.filter(f => allGrouped[f]?.length).map(family => (
                    <div key={family}>
                      <div className="px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                        {FAMILY_LABELS[family]}
                      </div>
                      {allGrouped[family]!.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-foreground">
                          {t.name} ({t.unit})
                        </SelectItem>
                      ))}
                    </div>
                  ));
                })()}
              </SelectContent>
            </Select>

            {sport !== 'hybrid' && !showAllTests && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllTests(true)}
                className="mt-2 text-xs text-primary hover:text-primary/80">
                <Library className="mr-1 h-3 w-3" /> Browse All Tests
              </Button>
            )}

            {selectedTest?.description && (
              <p className="mt-2 text-xs text-muted-foreground">{selectedTest.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">
                {isStreet ? "Added Load (kg)" : `Value (${selectedTest?.unit || "—"})`}
              </Label>
              <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={isStreet ? "0 = bodyweight only" : "0.00"} required
                className="mt-1 border-border bg-secondary text-foreground" />
            </div>
            {showReps && (
              <div>
                <Label className="text-muted-foreground">
                  {isStreet ? "Reps" : "Reps (1 = True 1RM)"}
                </Label>
                <Input type="number" min="1" max="36" value={reps} onChange={(e) => setReps(e.target.value)}
                  placeholder="1" className="mt-1 border-border bg-secondary text-foreground" />
              </div>
            )}
          </div>

          {/* Streetlifting computed metrics */}
          {isStreet && value && profile?.weight_kg && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">Total Load (BW + Added)</p>
              <p className="text-2xl font-bold text-primary">{totalLoad?.toFixed(1)} kg</p>
              {streetRelStrength && (
                <p className="text-sm text-muted-foreground">Relative: <span className="text-primary">{streetRelStrength}x BW</span></p>
              )}
            </div>
          )}

          {estimated1RM && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">Estimated 1RM (Brzycki)</p>
              <p className="text-2xl font-bold text-primary">{estimated1RM} kg</p>
              {relForce && (
                <p className="text-sm text-muted-foreground">Relative: <span className="text-primary">{relForce}x BW</span></p>
              )}
            </div>
          )}
          {is1RMDirect && value && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-4">
              <p className="text-sm text-muted-foreground">True 1RM</p>
              <p className="text-2xl font-bold text-success">{value} kg</p>
              {relForce && (
                <p className="text-sm text-muted-foreground">Relative: <span className="text-success">{relForce}x BW</span></p>
              )}
            </div>
          )}

          <div>
            <Label className="text-muted-foreground">Session Date</Label>
            <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
              className="mt-1 border-border bg-secondary text-foreground" />
          </div>

          <div>
            <Label className="text-muted-foreground">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations..." className="mt-1 border-border bg-secondary text-foreground" />
          </div>
        </motion.div>

        {/* Right: Wellness + Cycle + Submit */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card space-y-6 rounded-2xl p-6"
        >
          <Collapsible open={wellnessOpen} onOpenChange={setWellnessOpen}>
            <CollapsibleTrigger asChild>
              <button type="button"
                className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3 text-left transition-colors hover:bg-secondary">
                <span className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Calendar className="h-5 w-5 text-primary" /> Wellness Check-in
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${wellnessOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-6">
              {[
                { label: "Fatigue Level", value: fatigue, setter: setFatigue, desc: "1 = exhausted → 6 = fully rested" },
                { label: "Sleep Quality", value: sleep, setter: setSleep, desc: "1 = terrible → 6 = excellent" },
                { label: "Muscle Soreness", value: soreness, setter: setSoreness, desc: "1 = very sore → 6 = no soreness" },
                ...(showCycleTracking ? [{ label: "Period Pain", value: periodPain, setter: setPeriodPain, desc: "1 = severe pain → 6 = no pain" }] : []),
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">{item.label}</Label>
                    <span className="text-sm font-bold text-primary">
                      {item.value} — {wellnessLabels[item.value - 1]}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">{item.desc}</p>
                  <Slider value={[item.value]} onValueChange={([v]) => item.setter(v)} min={1} max={6} step={1} className="mt-1" />
                </div>
              ))}

              {/* Cycle Day Input — visible only for female/other */}
              {showCycleTracking && (
                <div>
                  <Label className="text-muted-foreground">Days since Day 1 of period (J1)</Label>
                  <p className="mb-2 text-xs text-muted-foreground">Enter cycle day to auto-calculate phase (optional)</p>
                  <Input
                    type="number"
                    min="1"
                    value={cycleDay}
                    onChange={(e) => setCycleDay(e.target.value)}
                    placeholder="e.g. 10"
                    className="mt-1 border-border bg-secondary text-foreground"
                  />
                  {cyclePhase && cycleDayNum && cycleDayNum >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-3"
                    >
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cyclePhase.color }} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cyclePhase.label}</p>
                        <p className="text-xs text-muted-foreground">J{cycleDayNum}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Wellness Score</p>
                <p className="text-3xl font-bold text-foreground">
                  {showCycleTracking
                    ? ((fatigue + sleep + soreness + periodPain) / 4).toFixed(1)
                    : ((fatigue + sleep + soreness) / 3).toFixed(1)
                  }
                </p>
                <p className="text-xs text-muted-foreground">/6.0</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" className="gradient-orange glow-orange w-full text-primary-foreground"
            disabled={!selectedTestId || !value || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Result"}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
