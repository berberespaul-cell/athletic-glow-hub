import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { progressionDelta, isLowerBetter, cmjSjRatio, cmjAbalakovRatio, isStreetlifting, streetliftingRelativeStrength, cycleDayToPhase } from "@/lib/calculations";
import { FAMILY_LABELS, FAMILY_ORDER, type TestFamily } from "@/lib/sportTests";
import { Activity, TrendingUp, TrendingDown, Minus, Target, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import TestDetailView from "@/components/TestDetailView";
import { SportBadge } from "@/components/SportBadge";
import TestInfoModal, { TestInfoButton } from "@/components/TestInfoModal";

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

export default function Dashboard() {
  const { profileId, role } = useAuth();
  const [selectedTest, setSelectedTest] = useState<{ id: string; name: string } | null>(null);
  const [infoTest, setInfoTest] = useState<any>(null);

  const { data: allResults } = useQuery({
    queryKey: ["all-results-dash", profileId],
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

  const { data: profile } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId).single();
      return data;
    },
    enabled: !!profileId,
  });

  // If a test is selected, show the detail view
  if (selectedTest) {
    return (
      <TestDetailView
        testId={selectedTest.id}
        testName={selectedTest.name}
        onBack={() => setSelectedTest(null)}
      />
    );
  }

  // Build categorized summary
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
        testId,
        name: info.name,
        family: info.family,
        unit: info.unit,
        latest: Number(latest.value),
        latestDate: latest.session_date,
        pb,
        isPB: Number(latest.value) === pb,
        trend,
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

  // Jump ratios
  const getLatestValue = (name: string) => {
    const match = allResults?.find((r: any) => r.test_library?.name === name);
    return match ? Number(match.value) : null;
  };
  const cmjVal = getLatestValue("CMJ (Counter Movement Jump)");
  const sjVal = getLatestValue("Squat Jump (SJ)");
  const abalVal = getLatestValue("Abalakov Jump");
  const cmjSj = cmjVal && sjVal ? cmjSjRatio(cmjVal, sjVal) : null;
  const cmjAbal = cmjVal && abalVal ? cmjAbalakovRatio(cmjVal, abalVal) : null;

  const TrendIcon = ({ trend }: { trend: number | null }) => {
    if (trend === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const get1RMLabel = (s: TestSummary) => {
    if (!['strength', 'weightlifting'].includes(s.family)) return null;
    if (s.latestReps === null || s.latestReps === 1) return "True 1RM";
    return `Est. 1RM (${s.latestReps}r)`;
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back{profile?.name ? `, ${profile.name}` : ""}
            </h1>
            <SportBadge />
          </div>
          <p className="mt-1 text-muted-foreground">
            {role === "coach" ? "Your team at a glance" : "Your performance overview"}
          </p>
        </div>

        {/* Jump Ratio Cards */}
        {(cmjSj !== null || cmjAbal !== null) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cmjSj !== null && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm">CMJ / SJ Ratio</span>
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">{cmjSj}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cmjSj >= 1.05 && cmjSj <= 1.2 ? "✅ Optimal SSC" : cmjSj > 1.2 ? "⚠️ Over-reliant on SSC" : "⚠️ Low SSC"}
                </p>
              </motion.div>
            )}
            {cmjAbal !== null && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm">CMJ / Abalakov</span>
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">{cmjAbal}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cmjAbal >= 0.8 && cmjAbal <= 0.95 ? "✅ Good arm coordination" : cmjAbal < 0.8 ? "⚠️ Poor coordination" : "✅ Minimal arm contribution"}
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Categorized Summary — clickable cards */}
        {FAMILY_ORDER.filter(f => summariesByFamily[f]?.length).map((family, fi) => (
          <motion.div
            key={family}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * fi }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="mb-4 text-lg font-semibold capitalize text-foreground">
              {FAMILY_LABELS[family]}
            </h2>
            <div className="space-y-2">
              {summariesByFamily[family]!.map(s => {
                const rmLabel = get1RMLabel(s);
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
                          const test = allResults?.find((r: any) => r.test_id === s.testId);
                          setInfoTest({ name: s.name, family: s.family, unit: s.unit, description: test?.test_library?.description });
                        }} />
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{s.latestDate}</span>
                        {rmLabel && <span className="text-primary/80">• {rmLabel}</span>}
                        {isStreet && streetRS && (
                          <span className="text-primary/80">• {streetRS}x BW</span>
                        )}
                        {s.wellnessScore !== null && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">😴 {s.wellnessScore.toFixed(1)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Wellness: {s.wellnessScore.toFixed(1)}/6</p>
                              {s.cycleDay && (() => {
                                const phase = cycleDayToPhase(s.cycleDay);
                                return <p style={{ color: phase.color }}>{phase.label} — J{s.cycleDay}</p>;
                              })()}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!s.wellnessScore && s.cycleDay && (() => {
                          const phase = cycleDayToPhase(s.cycleDay);
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help" style={{ color: phase.color }}>●</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p style={{ color: phase.color }}>{phase.label} — J{s.cycleDay}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-lg font-bold text-primary">
                          {s.latest} {s.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PB: {s.pb} {s.unit} {s.isPB && "🏆"}
                        </p>
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

        {/* Empty state */}
        {summaryByTest.size === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex flex-col items-center py-12 text-center">
              <Activity className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">No results yet. Start by recording a test!</p>
            </div>
          </motion.div>
        )}
        <TestInfoModal test={infoTest} open={!!infoTest} onOpenChange={(open) => !open && setInfoTest(null)} />
      </div>
    </TooltipProvider>
  );
}
