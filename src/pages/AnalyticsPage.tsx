import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { progressionDelta, coefficientOfVariation, isLowerBetter, cmjSjRatio, cmjAbalakovRatio, relativeForce } from "@/lib/calculations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
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

  // Tests that have results
  const testedIds = [...new Set(allResults?.map(r => r.test_id) || [])];
  const testedTests = tests?.filter(t => testedIds.includes(t.id)) || [];

  // Progression data for selected test
  const selectedResults = selectedTestId
    ? allResults?.filter(r => r.test_id === selectedTestId) || []
    : [];
  const selectedTest = tests?.find(t => t.id === selectedTestId);

  const chartData = selectedResults.map((r, i) => ({
    date: r.session_date,
    value: Number(r.value),
    delta: i > 0
      ? progressionDelta(
          Number(selectedResults[i - 1].value),
          Number(r.value),
          isLowerBetter(selectedTest?.family || "")
        )
      : 0,
  }));

  // CV for selected test
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
  const strengthTests = allResults?.filter((r: any) => ['strength', 'weightlifting'].includes(r.test_library?.family)) || [];
  const latestStrength: { name: string; value: number; rf: number | null }[] = [];
  const seenStrength = new Set<string>();
  for (let i = strengthTests.length - 1; i >= 0; i--) {
    const r = strengthTests[i] as any;
    if (!seenStrength.has(r.test_id)) {
      seenStrength.add(r.test_id);
      const rf = profile?.weight_kg ? relativeForce(Number(r.value), Number(profile.weight_kg)) : null;
      latestStrength.push({ name: r.test_library?.name, value: Number(r.value), rf });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Performance trends and insights</p>
      </div>

      {/* Jump Ratios + Strength */}
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
            {s.rf && <p className="mt-1 text-sm text-primary">{s.rf}x BW</p>}
          </motion.div>
        ))}
      </div>

      {/* Progression Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" /> Progression
          </h3>
          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
            <SelectTrigger className="w-64 border-border bg-secondary text-foreground">
              <SelectValue placeholder="Select test..." />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              {testedTests.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-foreground">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="hsl(0 0% 64%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 64%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 10%)",
                    border: "1px solid hsl(0 0% 18%)",
                    borderRadius: "12px",
                    color: "hsl(0 0% 95%)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(14 100% 60%)"
                  strokeWidth={3}
                  dot={{ fill: "hsl(14 100% 60%)", r: 5 }}
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
