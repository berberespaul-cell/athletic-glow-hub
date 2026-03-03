import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { wellnessLabel, progressionDelta, isLowerBetter } from "@/lib/calculations";
import { FAMILY_LABELS, FAMILY_ORDER, type TestFamily } from "@/lib/sportTests";
import { Activity, TrendingUp, TrendingDown, Minus, Zap, Timer, Dumbbell, Weight } from "lucide-react";

export default function Dashboard() {
  const { profileId, role } = useAuth();

  const { data: allResults } = useQuery({
    queryKey: ["all-results-dash", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data } = await supabase
        .from("results")
        .select("*, test_library(name, family, unit)")
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

  const latestWellness = allResults?.find(r => r.wellness_score !== null);
  const wl = latestWellness?.wellness_score ? wellnessLabel(Number(latestWellness.wellness_score)) : null;

  // Build categorized summary: latest value vs PB with trend %
  type TestSummary = {
    testId: string;
    name: string;
    family: string;
    unit: string;
    latest: number;
    latestDate: string;
    pb: number;
    isPB: boolean;
    trend: number | null; // % change from previous to latest
  };

  const summaryByTest = new Map<string, TestSummary>();

  if (allResults) {
    // allResults is sorted desc by session_date
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
      });
    });
  }

  // Group summaries by family
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{profile?.name ? `, ${profile.name}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {role === "coach" ? "Your team at a glance" : "Your performance overview"}
        </p>
      </div>

      {/* Wellness Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-xs rounded-2xl p-6"
      >
        <p className="text-sm text-muted-foreground">Wellness Score</p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-4xl font-bold" style={{ color: wl?.color || "hsl(var(--muted-foreground))" }}>
            {latestWellness?.wellness_score ? Number(latestWellness.wellness_score).toFixed(1) : "—"}
          </span>
          <span className="mb-1 text-sm" style={{ color: wl?.color }}>
            {wl?.label || "No data"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">/6.0 scale</p>
      </motion.div>

      {/* Categorized Summary */}
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
            {summariesByFamily[family]!.map(s => (
              <div
                key={s.testId}
                className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.latestDate}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
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
                </div>
              </div>
            ))}
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
    </div>
  );
}
