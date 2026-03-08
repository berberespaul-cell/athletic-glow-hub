import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getTestsForSport, getRecommendedTestNames, FAMILY_LABELS, FAMILY_ORDER, type SportType, type TestFamily } from "@/lib/sportTests";
import { Save, User, Weight, Plus, Link2, Pencil, ChevronRight, Activity, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { SportBadge } from "@/components/SportBadge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { progressionDelta, isLowerBetter, isStreetlifting, streetliftingRelativeStrength, cycleDayToPhase } from "@/lib/calculations";
import TestDetailView from "@/components/TestDetailView";


const SPORTS: SportType[] = ["rugby", "basketball", "volleyball", "hybrid"];

export default function ProfilePage() {
  const { profileId, role } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selectedTest, setSelectedTest] = useState<{ id: string; name: string } | null>(null);
  

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: weightLogs } = useQuery({
    queryKey: ["weight-logs", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("profile_id", profileId!)
        .order("logged_at", { ascending: true });
      return data || [];
    },
    enabled: !!profileId,
  });

  const { data: allResults } = useQuery({
    queryKey: ["all-results-profile", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data } = await supabase
        .from("results")
        .select("*, test_library(name, family, unit, description)")
        .eq("profile_id", profileId)
        .order("session_date", { ascending: false });
      return data || [];
    },
    enabled: !!profileId,
  });

  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportType>("hybrid");
  const [position, setPosition] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [claimCode, setClaimCode] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSport(profile.sport as SportType);
      setPosition(profile.position || "");
      setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
      setHeight(profile.height_cm ? String(profile.height_cm) : "");
      setBirthDate(profile.birth_date || "");
      setSex((profile as any).sex || "");
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          name, sport,
          position: position || null,
          weight_kg: weight ? Number(weight) : null,
          height_cm: height ? Number(height) : null,
          birth_date: birthDate || null,
          sex: sex || null,
        } as any)
        .eq("id", profileId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      toast({ title: "Profile updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const weightLogMutation = useMutation({
    mutationFn: async () => {
      const w = Number(newWeight);
      if (!w || w <= 0) throw new Error("Invalid weight");
      const { error: logErr } = await supabase.from("weight_logs").insert({ profile_id: profileId!, weight_kg: w });
      if (logErr) throw logErr;
      const { error: profErr } = await supabase.from("profiles").update({ weight_kg: w }).eq("id", profileId!);
      if (profErr) throw profErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setNewWeight("");
      setWeight(newWeight);
      toast({ title: "Weight logged!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const code = claimCode.trim().toUpperCase();
      if (!code) throw new Error("Please enter a code");
      const { data: targetProfile, error: findErr } = await supabase
        .from("profiles")
        .select("id, name, coach_created_by")
        .eq("invite_code", code)
        .maybeSingle();
      if (findErr || !targetProfile) throw new Error("Invalid code. No matching profile found.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ user_id: user.id, invite_code: null } as any)
        .eq("id", targetProfile.id);
      if (updateErr) throw updateErr;
      if (profileId && profileId !== targetProfile.id) {
        await supabase.from("profiles").delete().eq("id", profileId);
      }
      if (targetProfile.coach_created_by) {
        await supabase.from("coach_athletes").insert({
          coach_id: targetProfile.coach_created_by,
          athlete_id: user.id,
        } as any);
      }
      return targetProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setClaimCode("");
      toast({ title: "Profile claimed!", description: `You're now linked as ${data.name}.` });
      window.location.reload();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Calculate age
  const age = profile?.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Weight chart data
  const weightChartData = weightLogs?.map(l => ({
    date: new Date(l.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: Number(l.weight_kg),
  })) || [];

  // Performance summaries
  type TestSummary = {
    testId: string; name: string; family: string; unit: string;
    latest: number; latestDate: string; pb: number; isPB: boolean;
    trend: number | null; latestReps: number | null;
    wellnessScore: number | null; menstrualPhase: string | null; cycleDay: number | null;
  };

  const summaryByTest = new Map<string, TestSummary>();
  if (allResults) {
    const grouped = new Map<string, typeof allResults>();
    allResults.forEach(r => {
      if (!grouped.has(r.test_id)) grouped.set(r.test_id, []);
      grouped.get(r.test_id)!.push(r);
    });
    grouped.forEach((results, testId) => {
      const info = results[0].test_library as any;
      if (!info) return;
      const latest = results[0];
      const lowerBetter = isLowerBetter(info.family);
      const values = results.map(r => Number(r.value));
      const pb = lowerBetter ? Math.min(...values) : Math.max(...values);
      const trend = results.length >= 2
        ? progressionDelta(Number(results[1].value), Number(results[0].value), lowerBetter)
        : null;
      summaryByTest.set(testId, {
        testId, name: info.name, family: info.family, unit: info.unit,
        latest: Number(latest.value), latestDate: latest.session_date,
        pb, isPB: Number(latest.value) === pb, trend,
        latestReps: latest.reps ?? null,
        wellnessScore: latest.wellness_score ? Number(latest.wellness_score) : null,
        menstrualPhase: (latest as any).menstrual_phase || null,
        cycleDay: (latest as any).cycle_day ?? null,
      });
    });
  }

  const summariesByFamily: Partial<Record<TestFamily, TestSummary[]>> = {};
  summaryByTest.forEach(s => {
    const fam = s.family as TestFamily;
    if (!summariesByFamily[fam]) summariesByFamily[fam] = [];
    summariesByFamily[fam]!.push(s);
  });

  const TrendIcon = ({ trend }: { trend: number | null }) => {
    if (trend === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const isCoach = role === "coach";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // If viewing a test detail, show that
  if (selectedTest) {
    return (
      <TestDetailView
        testId={selectedTest.id}
        testName={selectedTest.name}
        onBack={() => setSelectedTest(null)}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* ═══════════════════════════════════════════════════
            SECTION 1 — Profile Header
        ═══════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6">
          {!editing ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-foreground">{profile?.name || "—"}</h1>
                    <SportBadge />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {age !== null && <span>{age} yrs</span>}
                    {profile?.position && <span>• {profile.position}</span>}
                    {profile?.height_cm && <span>• {profile.height_cm} cm</span>}
                    {profile?.weight_kg && <span>• {profile.weight_kg} kg</span>}
                    {(profile as any)?.sex && <span className="capitalize">• {(profile as any).sex}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setEditing(true)} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <div className="space-y-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <User className="h-5 w-5 text-primary" /> Edit Profile
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border-border bg-secondary text-foreground" />
                </div>
                {!isCoach && (
                  <div>
                    <Label className="text-muted-foreground">Sport</Label>
                    <Select value={sport} onValueChange={(v) => setSport(v as SportType)}>
                      <SelectTrigger className="mt-1 border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="border-border bg-card">
                        {SPORTS.map(s => <SelectItem key={s} value={s} className="capitalize text-foreground">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Sex</Label>
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger className="mt-1 border-border bg-secondary text-foreground"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent className="border-border bg-card">
                      <SelectItem value="male" className="text-foreground">Male</SelectItem>
                      <SelectItem value="female" className="text-foreground">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isCoach && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Position</Label>
                      <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Point Guard" className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Birth Date</Label>
                      <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Weight (kg)</Label>
                      <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75.0" className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Height (cm)</Label>
                      <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="180.0" className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => mutation.mutate()} className="gradient-orange text-primary-foreground" disabled={mutation.isPending}>
                  <Save className="mr-2 h-4 w-4" /> {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)} className="text-muted-foreground">Cancel</Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Link to Coach (athlete only, outside edit mode) */}
        {!isCoach && !editing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Link2 className="h-5 w-5 text-primary" /> Link to Coach
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">Enter the code your coach gave you to link your profile.</p>
            <div className="flex gap-2 max-w-md">
              <Input value={claimCode} onChange={e => setClaimCode(e.target.value)}
                placeholder="e.g. A1B2C3D4" className="border-border bg-secondary font-mono text-foreground uppercase" />
              <Button onClick={() => claimMutation.mutate()} className="gradient-orange text-primary-foreground"
                disabled={!claimCode.trim() || claimMutation.isPending}>
                {claimMutation.isPending ? "..." : "Claim"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
            SECTION 2 — Weight Evolution (athletes only)
        ═══════════════════════════════════════════════════ */}
        {!isCoach && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Weight className="h-5 w-5 text-primary" /> Weight Evolution
            </h3>
            <div className="mb-4 flex items-end gap-3">
              <div className="max-w-xs flex-1">
                <Label className="text-muted-foreground">Log today's weight (kg)</Label>
                <Input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                  placeholder={weight || "75.0"} className="mt-1 border-border bg-secondary text-foreground" />
              </div>
              <Button onClick={() => weightLogMutation.mutate()} disabled={!newWeight || weightLogMutation.isPending}
                className="gradient-orange text-primary-foreground">
                <Plus className="mr-1 h-4 w-4" /> Log
              </Button>
            </div>
            {weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightChartData}>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={['auto', 'auto']} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="weight" stroke="hsl(14 100% 60%)" strokeWidth={2} dot={{ fill: "hsl(14 100% 60%)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {weightChartData.length === 1 ? "Log more weights to see your trend." : "No weight logs yet. Start logging above!"}
              </p>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
            SECTION 3 — Performance & Tests (athletes only)
        ═══════════════════════════════════════════════════ */}
        {!isCoach && (
          <>
            <div>
              <h2 className="text-xl font-bold text-foreground">Performance History</h2>
              <p className="mt-1 text-sm text-muted-foreground">All your test results grouped by category</p>
            </div>

            {FAMILY_ORDER.filter(f => summariesByFamily[f]?.length).map((family, fi) => (
              <motion.div
                key={family}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + 0.05 * fi }}
                className="glass-card rounded-2xl p-6"
              >
                <h3 className="mb-4 text-lg font-semibold capitalize text-foreground">
                  {FAMILY_LABELS[family]}
                </h3>
                <div className="space-y-2">
                  {summariesByFamily[family]!.map(s => {
                    const isStreet = isStreetlifting(s.family);
                    const streetRS = isStreet && profile?.weight_kg
                      ? streetliftingRelativeStrength(s.latest, Number(profile.weight_kg))
                      : null;

                    return (
                      <button
                        key={s.testId}
                        onClick={() => setSelectedTest({ id: s.testId, name: s.name })}
                        className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-left transition-colors hover:bg-secondary"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                            {s.name}
                            <TestInfoButton onClick={() => {
                              const test = allResults?.find((r: any) => r.test_id === s.testId) as any;
                              setInfoTest({ name: s.name, family: s.family, unit: s.unit, description: test?.test_library?.description });
                            }} />
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{s.latestDate}</span>
                            {isStreet && streetRS && <span className="text-primary/80">• {streetRS}x BW</span>}
                            {s.wellnessScore !== null && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">😴 {s.wellnessScore.toFixed(1)}</span>
                                </TooltipTrigger>
                                <TooltipContent><p>Wellness: {s.wellnessScore.toFixed(1)}/6</p></TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-lg font-bold text-primary">{s.latest} {s.unit}</p>
                            <p className="text-xs text-muted-foreground">PB: {s.pb} {s.unit} {s.isPB && "🏆"}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendIcon trend={s.trend} />
                            {s.trend !== null && (
                              <span className={`text-sm font-bold ${s.trend > 0 ? "text-success" : s.trend < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {s.trend > 0 ? "+" : ""}{s.trend}%
                              </span>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            {summaryByTest.size === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="glass-card rounded-2xl p-6">
                <div className="flex flex-col items-center py-12 text-center">
                  <Activity className="mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No results yet. Start by recording a test!</p>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Coach-only panel */}
        {isCoach && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Coach Mode</h3>
            <p className="text-sm text-muted-foreground">
              As a coach, manage your teams and athletes from the <span className="font-medium text-primary">Teams</span> page.
              Use the <span className="font-medium text-primary">Team Test Entry</span> to log bulk results.
            </p>
          </motion.div>
        )}

        <TestInfoModal test={infoTest} open={!!infoTest} onOpenChange={(open) => !open && setInfoTest(null)} />
      </div>
    </TooltipProvider>
  );
}
