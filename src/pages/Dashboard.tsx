import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { progressionDelta, isLowerBetter, cmjSjRatio, cmjAbalakovRatio, isStreetlifting, streetliftingRelativeStrength, cycleDayToPhase } from "@/lib/calculations";
import { FAMILY_LABELS, FAMILY_ORDER, type TestFamily } from "@/lib/sportTests";
import { Activity, TrendingUp, TrendingDown, Minus, ChevronRight, FileDown, Dumbbell, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useMemo, useState } from "react";
import TestDetailView from "@/components/TestDetailView";
import CompactCalendar from "@/components/CompactCalendar";
import GoalsBlock from "@/components/GoalsBlock";
import MaxPredictor from "@/components/MaxPredictor";
import JumpRatioCard from "@/components/JumpRatioCard";
import { SportBadge } from "@/components/SportBadge";
import { Button } from "@/components/ui/button";
import { exportAthleteReport, type AthleteReportData } from "@/lib/pdfExport";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { brzycki1RM, relativeForce } from "@/lib/calculations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [exporting, setExporting] = useState(false);
  const [maxPredictorOpen, setMaxPredictorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TestFamily | null>(null);

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

  // Dynamic categories from test_library
  const { data: libraryFamilies } = useQuery({
    queryKey: ["library-families"],
    queryFn: async () => {
      const { data } = await supabase.from("test_library").select("family");
      const set = new Set<string>();
      data?.forEach((r: any) => r.family && set.add(r.family));
      return Array.from(set) as TestFamily[];
    },
  });

  // Build categorized summary
  const summaryByTest = useMemo(() => {
    const map = new Map<string, TestSummary>();
    if (!allResults) return map;
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
      map.set(testId, {
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
    return map;
  }, [allResults]);

  const summariesByFamily = useMemo(() => {
    const out: Partial<Record<TestFamily, TestSummary[]>> = {};
    summaryByTest.forEach(s => {
      const fam = s.family as TestFamily;
      if (!out[fam]) out[fam] = [];
      out[fam]!.push(s);
    });
    return out;
  }, [summaryByTest]);

  // Tab list: union of library families + any with results, ordered by FAMILY_ORDER
  const tabFamilies = useMemo(() => {
    const set = new Set<TestFamily>();
    (libraryFamilies || []).forEach(f => set.add(f));
    Object.keys(summariesByFamily).forEach(f => set.add(f as TestFamily));
    const ordered = FAMILY_ORDER.filter(f => set.has(f));
    // append any unknown families at the end
    set.forEach(f => { if (!ordered.includes(f)) ordered.push(f); });
    return ordered;
  }, [libraryFamilies, summariesByFamily]);

  // Default active tab: first family with results
  const effectiveTab: TestFamily | null = useMemo(() => {
    if (activeTab && tabFamilies.includes(activeTab)) return activeTab;
    const firstWithResults = tabFamilies.find(f => (summariesByFamily[f]?.length || 0) > 0);
    return firstWithResults || tabFamilies[0] || null;
  }, [activeTab, tabFamilies, summariesByFamily]);

  if (selectedTest) {
    return (
      <TestDetailView
        testId={selectedTest.id}
        testName={selectedTest.name}
        onBack={() => setSelectedTest(null)}
      />
    );
  }

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

  const handleExportPDF = async () => {
    if (!profile || !allResults) return;
    setExporting(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentResults = allResults.filter(r => new Date(r.session_date) >= sevenDaysAgo && r.wellness_score);
      let wellnessAvg: AthleteReportData["wellnessAvg"] = null;
      if (recentResults.length > 0) {
        const avgField = (field: string) => {
          const vals = recentResults.map(r => Number((r as any)[field])).filter(v => v > 0);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        };
        wellnessAvg = {
          sleep: avgField("wellness_sleep"),
          soreness: avgField("wellness_soreness"),
          fatigue: avgField("wellness_fatigue"),
          overall: recentResults.reduce((a, r) => a + Number(r.wellness_score), 0) / recentResults.length,
        };
      }
      const topRecords: AthleteReportData["topRecords"] = [];
      summaryByTest.forEach(s => {
        topRecords.push({ name: s.name, value: s.pb, unit: s.unit, date: s.latestDate });
      });
      topRecords.sort((a, b) => b.value - a.value);

      exportAthleteReport({
        name: profile.name,
        sport: profile.sport,
        weight: profile.weight_kg ? Number(profile.weight_kg) : null,
        wellnessAvg,
        topRecords: topRecords.slice(0, 5),
        chartImageBase64: null,
        chartTitle: "Overview",
      });
      toast({ title: "PDF exported!", description: "Your performance report has been downloaded." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const renderTestRow = (s: TestSummary) => {
    const rmLabel = get1RMLabel(s);
    const isStreet = isStreetlifting(s.family);
    const streetRS = isStreet && profile?.weight_kg
      ? streetliftingRelativeStrength(s.latest, Number(profile.weight_kg))
      : null;
    const isStrengthFamily = ['strength', 'weightlifting'].includes(s.family);
    const strengthToWeight = isStrengthFamily && profile?.weight_kg && !isStreet
      ? (() => {
          const oneRM = s.latestReps && s.latestReps > 1
            ? brzycki1RM(s.latest, s.latestReps)
            : s.latest;
          return relativeForce(oneRM, Number(profile.weight_kg));
        })()
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
            {strengthToWeight !== null && (
              <Badge className="ml-1.5 bg-primary/15 text-primary border-primary/30 text-[10px] px-1.5 py-0">
                <Dumbbell className="mr-0.5 h-2.5 w-2.5" />
                {strengthToWeight.toFixed(1)}x BW
              </Badge>
            )}
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
  };

  const activeFamilyResults = effectiveTab ? summariesByFamily[effectiveTab] || [] : [];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
          {role !== "coach" && summaryByTest.size > 0 && (
            <Button onClick={handleExportPDF} disabled={exporting} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              <FileDown className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export Report"}
            </Button>
          )}
        </div>

        {/* Compact Calendar */}
        {profileId && <CompactCalendar profileIds={[profileId]} />}

        {/* Jump Ratio Cards */}
        {(cmjSj !== null || cmjAbal !== null) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cmjSj !== null && (
              <JumpRatioCard type="cmj-sj" value={cmjSj} title="CMJ / SJ Ratio" />
            )}
            {cmjAbal !== null && (
              <JumpRatioCard type="cmj-abalakov" value={cmjAbal} title="CMJ / Abalakov Ratio" />
            )}
          </div>
        )}

        {/* Personal Goals — athletes only */}
        {role !== "coach" && profileId && <GoalsBlock profileId={profileId} />}

        {/* Category Tabs */}
        {tabFamilies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Tab bar */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              {tabFamilies.map((fam) => {
                const isActive = effectiveTab === fam;
                const count = summariesByFamily[fam]?.length || 0;
                return (
                  <button
                    key={fam}
                    onClick={() => setActiveTab(fam)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all
                      ${isActive
                        ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}
                    `}
                  >
                    {FAMILY_LABELS[fam] || fam}
                    {count > 0 && (
                      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                        ${isActive ? "bg-primary-foreground/20" : "bg-primary/15 text-primary"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="glass-card rounded-2xl p-6 space-y-3">
              {/* Max Predictor quick access — Weightlifting only */}
              {effectiveTab === "weightlifting" && (
                <Button
                  onClick={() => setMaxPredictorOpen(true)}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Max Predictor
                </Button>
              )}

              {activeFamilyResults.length > 0 ? (
                activeFamilyResults.map(renderTestRow)
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No results yet for this category</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty state — no library at all */}
        {tabFamilies.length === 0 && summaryByTest.size === 0 && (
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

        {/* Max Predictor Modal */}
        <Dialog open={maxPredictorOpen} onOpenChange={setMaxPredictorOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Max Predictor
              </DialogTitle>
            </DialogHeader>
            <MaxPredictor results={(allResults || []) as any} />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
