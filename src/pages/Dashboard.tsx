import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { wellnessLabel } from "@/lib/calculations";
import { Activity, TrendingUp, TrendingDown, Zap, Timer, Dumbbell } from "lucide-react";

export default function Dashboard() {
  const { profileId, role } = useAuth();

  const { data: recentResults } = useQuery({
    queryKey: ["recent-results", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data } = await supabase
        .from("results")
        .select("*, test_library(name, family, unit)")
        .eq("profile_id", profileId)
        .order("session_date", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!profileId,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      return data;
    },
    enabled: !!profileId,
  });

  const latestWellness = recentResults?.find(r => r.wellness_score !== null);
  const wl = latestWellness?.wellness_score ? wellnessLabel(Number(latestWellness.wellness_score)) : null;

  // Find best values
  const jumpResults = recentResults?.filter((r: any) => r.test_library?.family === 'jumps') || [];
  const bestJump = jumpResults.length > 0 ? Math.max(...jumpResults.map(r => Number(r.value))) : null;
  const strengthResults = recentResults?.filter((r: any) => ['strength', 'weightlifting'].includes(r.test_library?.family)) || [];
  const best1RM = strengthResults.length > 0 ? Math.max(...strengthResults.map(r => Number(r.value))) : null;
  const sprintResults = recentResults?.filter((r: any) => r.test_library?.family === 'sprints') || [];
  const bestSprint = sprintResults.length > 0 ? Math.min(...sprintResults.map(r => Number(r.value))) : null;

  const statCards = [
    { label: "Best Jump", value: bestJump ? `${bestJump} cm` : "—", icon: Zap, color: "text-primary" },
    { label: "Best 1RM", value: best1RM ? `${best1RM} kg` : "—", icon: Dumbbell, color: "text-primary" },
    { label: "Best Sprint", value: bestSprint ? `${bestSprint}s` : "—", icon: Timer, color: "text-primary" },
  ];

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

      {/* Wellness + Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Wellness Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
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

        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (i + 1) }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-4 text-3xl font-bold text-foreground">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Test Results</h2>
        {recentResults && recentResults.length > 0 ? (
          <div className="space-y-3">
            {recentResults.map((result: any) => (
              <div
                key={result.id}
                className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{result.test_library?.name}</p>
                  <p className="text-sm text-muted-foreground">{result.session_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {Number(result.value)} {result.test_library?.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Activity className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No results yet. Start by recording a test!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
