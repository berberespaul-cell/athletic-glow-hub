import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { progressionDelta, coefficientOfVariation, isLowerBetter, cmjSjRatio, cmjAbalakovRatio, relativeForce, isStrengthTest, isStreetlifting, streetliftingRelativeStrength, cycleDayToPhase, wellnessScore } from "@/lib/calculations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { BarChart3, TrendingUp, Target, Gauge } from "lucide-react";


export default function AnalyticsPage() {
  const { profileId } = useAuth();
  const [selectedTestId, setSelectedTestId] = useState<string>("");

  const { data: profile } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: allResults } = useQuery({
    queryKey: ["all-results", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("results")
        .select("*, test_library(name, family, unit)")
        .eq("profile_id", profileId!)
        .order("session_date", { ascending: true });
      return data || [];
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

  const profileSex = (profile as any)?.sex || "";
  const showCycle = profileSex === "female" || profileSex === "other";

  const testedIds = [...new Set(allResults?.map(r => r.test_id) || [])];
  const testedTests = tests?.filter(t => testedIds.includes(t.id)) || [];

  const selectedResults = selectedTestId
    ? allResults?.filter(r => r.test_id === selectedTestId) || []
    : [];
  const selectedTest = tests?.find(t => t.id === selectedTestId);
  const isSelectedStrength = selectedTest && isStrengthTest(selectedTest.family);
  const isSelectedStreet = selectedTest && isStreetlifting(selectedTest.family);

  const chartData = selectedResults.map((r: any, i) => {
    const reps = r.reps ?? 1;
    const is1RMDirect = reps === 1;
    const ws = r.wellness_fatigue && r.wellness_sleep && r.wellness_soreness
      ? wellnessScore(r.wellness_fatigue, r.wellness_sleep, r.wellness_soreness)
      : null;
    const cycleDay = r.cycle_day ?? null;
    const phase = cycleDay ? cycleDayToPhase(cycleDay) : null;
    const delta = i > 0
      ? progressionDelta(
          Number(selectedResults[i - 1].value),
          Number(r.value),
          isLowerBetter(selectedTest?.family || "")
        )
      : 0;

    return {
      date: r.session_date,
      value: Number(r.value),
      rmLabel: isSelectedStreet
        ? `Load: ${r.value}kg`
        : isSelectedStrength
        ? (is1RMDirect ? "True 1RM" : `Est. 1RM (${reps}r)`)
        : undefined,
      wellnessScore: ws,
      cycleDay,
      phaseLabel: phase?.label || null,
      phaseColor: phase?.color || null,
      phaseName: phase?.phase || null,
      delta,
      reps,
    };
  });

  // Build phase background zones for the chart
  const phaseZones: { x1: string; x2: string; phase: string }[] = [];
  if (showCycle && chartData.length > 0) {
    let currentPhase = chartData[0].phaseName;
    let zoneStart = chartData[0].date;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].phaseName !== currentPhase) {
        if (currentPhase) {
          phaseZones.push({ x1: zoneStart, x2: chartData[i - 1].date, phase: currentPhase });
        }
        currentPhase = chartData[i].phaseName;
        zoneStart = chartData[i].date;
      }
    }
    if (currentPhase) {
      phaseZones.push({ x1: zoneStart, x2: chartData[chartData.length - 1].date, phase: currentPhase });
    }
  }

  const cv = selectedResults.length >= 2
    ? coefficientOfVariation(selectedResults.map(r => Number(r.value)))
    : null;

  // Jump ratios
  const getLatestValue = (name: string) => {
    const results = allResults?.filter((r: any) => r.test_library?.name === name) || [];
    return results.length > 0 ? Number(results[results.length - 1].value) : null;
  };

  const cmjVal = getLatestValue("CMJ (Counter Movement Jump)");
  const sjVal = getLatestValue("Squat Jump (SJ)");
  const abalVal = getLatestValue("Abalakov Jump");
  const cmjSj = cmjVal && sjVal ? cmjSjRatio(cmjVal, sjVal) : null;
  const cmjAbal = cmjVal && abalVal ? cmjAbalakovRatio(cmjVal, abalVal) : null;

  // Relative force for strength tests
  const strengthTests = allResults?.filter((r: any) => isStrengthTest(r.test_library?.family) && !isStreetlifting(r.test_library?.family)) || [];
  const latestStrength: { name: string; value: number; rf: number | null; reps: number }[] = [];
  const seenStrength = new Set<string>();
  for (let i = strengthTests.length - 1; i >= 0; i--) {
    const r = strengthTests[i] as any;
    if (!seenStrength.has(r.test_id)) {
      seenStrength.add(r.test_id);
      const rf = profile?.weight_kg ? relativeForce(Number(r.value), Number(profile.weight_kg)) : null;
      latestStrength.push({ name: r.test_library?.name, value: Number(r.value), rf, reps: r.reps ?? 1 });
    }
  }

  // Streetlifting cards
  const streetTests = allResults?.filter((r: any) => isStreetlifting(r.test_library?.family)) || [];
  const latestStreet: { name: string; load: number; rs: number | null; reps: number }[] = [];
  const seenStreet = new Set<string>();
  for (let i = streetTests.length - 1; i >= 0; i--) {
    const r = streetTests[i] as any;
    if (!seenStreet.has(r.test_id)) {
      seenStreet.add(r.test_id);
      const rs = profile?.weight_kg ? streetliftingRelativeStrength(Number(r.value), Number(profile.weight_kg)) : null;
      latestStreet.push({ name: r.test_library?.name, load: Number(r.value), rs, reps: r.reps ?? 1 });
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card p-3 text-sm shadow-lg min-w-[200px]">
        {/* 1. Date */}
        <p className="font-semibold text-foreground">{d.date}</p>
        {/* 2. Performance Result */}
        <p className="font-bold text-primary">{d.value} {selectedTest?.unit}</p>
        {/* 3. 1RM Status */}
        {d.rmLabel && <p className="text-xs text-muted-foreground">{d.rmLabel}</p>}
        {/* 4. Average Wellness Score */}
        {d.wellnessScore !== null && (
          <p className="text-xs text-muted-foreground">Wellness: <span className="font-semibold text-foreground">{d.wellnessScore}/6</span></p>
        )}
        {/* 5. Menstrual Data (hidden for males) */}
        {showCycle && d.phaseLabel && (
          <p className="text-xs" style={{ color: d.phaseColor }}>
            {d.phaseLabel} — J{d.cycleDay}
          </p>
        )}
        {/* 6. Variation % */}
        {d.delta !== 0 && (
          <p className={`text-xs font-bold ${d.delta > 0 ? "text-success" : "text-destructive"}`}>
            {d.delta > 0 ? "+" : ""}{d.delta}%
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Performance trends and insights</p>
      </div>

      {/* Jump Ratios + Strength + Streetlifting */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cmjSj !== null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm">CMJ / SJ Ratio</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{cmjSj}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {cmjSj >= 1.05 && cmjSj <= 1.2 ? "✅ Optimal SSC efficiency" : cmjSj > 1.2 ? "⚠️ Over-reliant on SSC" : "⚠️ Low SSC contribution"}
            </p>
          </motion.div>
        )}
        {cmjAbal !== null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm">CMJ / Abalakov Ratio</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{cmjAbal}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {cmjAbal >= 0.8 && cmjAbal <= 0.95 ? "✅ Good arm coordination" : cmjAbal < 0.8 ? "⚠️ Poor arm-trunk coordination" : "✅ Minimal arm contribution needed"}
            </p>
          </motion.div>
        )}
        {latestStrength.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + 2) }} className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-sm">{s.name}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{s.value} kg</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.reps === 1 ? "True 1RM" : `Est. 1RM (${s.reps} reps)`}
            </p>
            {s.rf && <p className="mt-1 text-sm text-primary">{s.rf}x BW</p>}
          </motion.div>
        ))}
        {latestStreet.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + latestStrength.length + 2) }} className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-sm">{s.name}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">+{s.load} kg</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Added load • {s.reps} rep{s.reps > 1 ? "s" : ""}
            </p>
            {s.rs && <p className="mt-1 text-sm text-primary">{s.rs}x BW (total)</p>}
          </motion.div>
        ))}
      </div>

      {/* Progression Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" /> Progression
          </h3>
          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
            <SelectTrigger className="w-full sm:w-64 border-border bg-secondary text-foreground">
              <SelectValue placeholder="Select test..." />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              {testedTests.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-foreground">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Phase legend */}
        {showCycle && chartData.some(d => d.phaseName) && (
          <div className="mb-3 flex flex-wrap gap-3 text-xs">
            {[
              { label: "Menstrual", color: "hsl(0 84% 60%)" },
              { label: "Follicular", color: "hsl(142 71% 45%)" },
              { label: "Ovulatory", color: "hsl(38 92% 50%)" },
              { label: "Luteal", color: "hsl(270 60% 55%)" },
            ].map(p => (
              <span key={p.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-muted-foreground">{p.label}</span>
              </span>
            ))}
          </div>
        )}

        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                {/* Phase background zones */}
                {showCycle && phaseZones.map((zone, i) => (
                  <ReferenceArea
                    key={i}
                    x1={zone.x1}
                    x2={zone.x2}
                    fill={PHASE_COLORS[zone.phase] || "transparent"}
                    fillOpacity={1}
                  />
                ))}
                <XAxis dataKey="date" stroke="hsl(0 0% 64%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 64%)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(14 100% 60%)"
                  strokeWidth={3}
                  dot={({ cx, cy, payload }: any) => {
                    const color = showCycle && payload.phaseColor ? payload.phaseColor : "hsl(14 100% 60%)";
                    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(14 100% 60%)" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {cv !== null && (
              <p className="mt-4 text-sm text-muted-foreground">
                <BarChart3 className="mr-1 inline h-4 w-4 text-primary" />
                Coefficient of Variation: <span className={`font-bold ${cv < 5 ? 'text-success' : cv < 10 ? 'text-warning' : 'text-destructive'}`}>{cv}%</span>
                {cv < 5 ? " — Very consistent" : cv < 10 ? " — Acceptable" : " — Inconsistent"}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {selectedTestId ? "Not enough data for this test" : "Select a test to view progression"}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
