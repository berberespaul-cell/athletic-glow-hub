import { useAuth } from "@/contexts/AuthContext";
import { useCoachFocus } from "@/contexts/CoachFocusContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { progressionDelta, isLowerBetter, isStreetlifting, streetliftingRelativeStrength, cycleDayToPhase } from "@/lib/calculations";
import { FAMILY_LABELS, FAMILY_ORDER, type TestFamily } from "@/lib/sportTests";
import { Activity, TrendingUp, TrendingDown, Minus, ChevronRight, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useState, useMemo } from "react";
import TestDetailView from "@/components/TestDetailView";
import CoachFocusSelector from "@/components/CoachFocusSelector";
import { SportBadge } from "@/components/SportBadge";
import TeamPerformanceRankings from "@/components/TeamPerformanceRankings";
import TeamWellnessChart from "@/components/TeamWellnessChart";


type TestSummary = {
  testId: string;
  name: string;
  family: string;
  unit: string;
  latest: number;
  latestDate: string;
  pb: number;
  isPB: boolean;
  trend: number | null;
  latestReps: number | null;
  wellnessScore: number | null;
  menstrualPhase: string | null;
  cycleDay: number | null;
};

export default function CoachDashboard() {
  const { user } = useAuth();
  const { focus, setAthleteFocus } = useCoachFocus();
  const [selectedTest, setSelectedTest] = useState<{ id: string; name: string } | null>(null);
  const [rankingTestId, setRankingTestId] = useState<string | null>(null);
  const [infoTest, setInfoTest] = useState<any>(null);

  // Get team stats
  const { data: teams } = useQuery({
    queryKey: ["coach-teams", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, sport").eq("coach_id", user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: allAthletes } = useQuery({
    queryKey: ["coach-athletes-all", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name, sport, sex").eq("coach_created_by", user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // When focusing on a specific athlete, show their data
  const { data: athleteResults } = useQuery({
    queryKey: ["athlete-results", focus.athleteProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("results")
        .select("*, test_library(name, family, unit, description)")
        .eq("profile_id", focus.athleteProfileId!)
        .order("session_date", { ascending: false });
      return data || [];
    },
    enabled: focus.mode === "athlete" && !!focus.athleteProfileId,
  });

  const { data: athleteProfile } = useQuery({
    queryKey: ["profile", focus.athleteProfileId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", focus.athleteProfileId!).single();
      return data;
    },
    enabled: focus.mode === "athlete" && !!focus.athleteProfileId,
  });

  // Fetch team member IDs then all their results for team analytics
  const { data: teamMemberIds } = useQuery({
    queryKey: ["team-member-ids", focus.teamId],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("profile_id").eq("team_id", focus.teamId!);
      return data?.map(d => d.profile_id) || [];
    },
    enabled: focus.mode === "team" && !!focus.teamId,
  });

  const { data: teamResults } = useQuery({
    queryKey: ["team-results", focus.teamId, teamMemberIds],
    queryFn: async () => {
      if (!teamMemberIds?.length) return [];
      const { data } = await supabase
        .from("results")
        .select("*, test_library(name, family, unit, description), profiles(name)")
        .in("profile_id", teamMemberIds)
        .order("session_date", { ascending: false });
      return data || [];
    },
    enabled: focus.mode === "team" && !!teamMemberIds?.length,
  });

  // Derive unique tests from team results
  const teamTests = useMemo(() => {
    if (!teamResults?.length) return [];
    const seen = new Map<string, { id: string; name: string; unit: string; family: string }>();
    teamResults.forEach((r: any) => {
      if (r.test_library && !seen.has(r.test_id)) {
        seen.set(r.test_id, { id: r.test_id, name: r.test_library.name, unit: r.test_library.unit, family: r.test_library.family });
      }
    });
    return Array.from(seen.values());
  }, [teamResults]);

  const handleTeamAthleteClick = (profileId: string, name: string) => {
    setAthleteFocus(profileId, name);
  };

  if (selectedTest && focus.mode === "athlete" && focus.athleteProfileId) {
    return (
      <TestDetailView
        testId={selectedTest.id}
        testName={selectedTest.name}
        onBack={() => setSelectedTest(null)}
        overrideProfileId={focus.athleteProfileId}
      />
    );
  }

  // Build summaries for focused athlete
  const summaryByTest = new Map<string, TestSummary>();
  if (focus.mode === "athlete" && athleteResults) {
    const grouped = new Map<string, typeof athleteResults>();
    athleteResults.forEach(r => {
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Coach Dashboard</h1>
            <SportBadge />
          </div>
          <p className="mt-1 text-muted-foreground">Manage your teams and track athlete performance</p>
        </div>

        <CoachFocusSelector />

        {/* Overview when no focus */}
        {!focus.mode && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{teams?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Teams</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{allAthletes?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Athletes</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Athlete focus: show their performance cards */}
        {focus.mode === "athlete" && (
          <>
            {FAMILY_ORDER.filter(f => summariesByFamily[f]?.length).map((family, fi) => (
              <motion.div key={family} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * fi }} className="glass-card rounded-2xl p-6">
                <h2 className="mb-4 text-lg font-semibold capitalize text-foreground">{FAMILY_LABELS[family]}</h2>
                <div className="space-y-2">
                  {summariesByFamily[family]!.map(s => {
                    const isStreet = isStreetlifting(s.family);
                    const streetRS = isStreet && athleteProfile?.weight_kg
                      ? streetliftingRelativeStrength(s.latest, Number(athleteProfile.weight_kg)) : null;

                    return (
                      <button key={s.testId} onClick={() => setSelectedTest({ id: s.testId, name: s.name })}
                        className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-left transition-colors hover:bg-secondary">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                            {s.name}
                            <TestInfoButton onClick={() => {
                              const test = (athleteResults as any)?.find((r: any) => r.test_id === s.testId);
                              setInfoTest({ name: s.name, family: s.family, unit: s.unit, description: test?.test_library?.description });
                            }} />
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{s.latestDate}</span>
                            {isStreet && streetRS && <span className="text-primary/80">• {streetRS}x BW</span>}
                            {s.cycleDay && (() => {
                              const phase = cycleDayToPhase(s.cycleDay);
                              return <span style={{ color: phase.color }}>● {phase.label}</span>;
                            })()}
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
                <div className="flex flex-col items-center py-12 text-center">
                  <Activity className="mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No results yet for {focus.athleteName}.</p>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Team focus: show analytics */}
        {focus.mode === "team" && (
          <>
            <TeamPerformanceRankings
              results={teamResults || []}
              tests={teamTests}
              onAthleteClick={handleTeamAthleteClick}
              selectedTestId={rankingTestId}
              onTestChange={setRankingTestId}
            />
            <TeamWellnessChart
              results={teamResults || []}
              onAthleteClick={handleTeamAthleteClick}
            />
          </>
        )}
        <TestInfoModal test={infoTest} open={!!infoTest} onOpenChange={(open) => !open && setInfoTest(null)} />
      </div>
    </TooltipProvider>
  );
}
