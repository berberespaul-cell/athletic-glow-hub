import { useMemo } from "react";
import { motion } from "framer-motion";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from "recharts";
import { Activity } from "lucide-react";

interface WellnessPoint {
  profileId: string;
  name: string;
  score: number;
  sleep: number;
  soreness: number;
  fatigue: number;
  x: number; // index for scatter spread
}

interface Props {
  results: any[];
  onAthleteClick: (profileId: string, name: string) => void;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as WellnessPoint;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">Wellness: <span className="font-bold text-primary">{d.score.toFixed(1)}/6</span></p>
      <p className="text-muted-foreground">Sleep: {d.sleep}/6 · Soreness: {d.soreness}/6 · Fatigue: {d.fatigue}/6</p>
    </div>
  );
}

export default function TeamWellnessChart({ results, onAthleteClick }: Props) {
  const data = useMemo(() => {
    // Get latest result per athlete that has wellness data
    const latestByAthlete = new Map<string, any>();
    const sorted = [...results]
      .filter(r => r.wellness_score != null)
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());

    sorted.forEach(r => {
      if (!latestByAthlete.has(r.profile_id)) latestByAthlete.set(r.profile_id, r);
    });

    const points: WellnessPoint[] = Array.from(latestByAthlete.values()).map((r, i) => ({
      profileId: r.profile_id,
      name: r.profiles?.name || "Unknown",
      score: Number(r.wellness_score),
      sleep: Number(r.wellness_sleep || 0),
      soreness: Number(r.wellness_soreness || 0),
      fatigue: Number(r.wellness_fatigue || 0),
      x: i + 1,
    }));

    return points;
  }, [results]);

  const scores = data.map(d => d.score);
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const stdDev = scores.length > 1
    ? Math.sqrt(scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length)
    : 0;
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const range = max - min;

  if (!data.length) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <div className="flex flex-col items-center py-8 text-center">
          <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No wellness data recorded yet</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 lg:col-span-3">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Team Readiness Distribution</h2>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" dataKey="x" domain={[0, data.length + 1]} tick={false}
                label={{ value: "Athletes", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis type="number" dataKey="score" domain={[0, 6.5]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                label={{ value: "Wellness Score", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />

              {/* ±1 SD band */}
              <ReferenceArea y1={Math.max(0, mean - stdDev)} y2={Math.min(6, mean + stdDev)}
                fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeOpacity={0} />

              {/* Mean line */}
              <ReferenceLine y={mean} stroke="hsl(var(--primary))" strokeDasharray="6 3" strokeWidth={2}
                label={{ value: `Mean ${mean.toFixed(1)}`, position: "right", fill: "hsl(var(--primary))", fontSize: 11 }} />

              {/* Min / Max lines */}
              <ReferenceLine y={min} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeWidth={1}
                label={{ value: `Min ${min.toFixed(1)}`, position: "right", fill: "hsl(var(--destructive))", fontSize: 10 }} />
              <ReferenceLine y={max} stroke="hsl(var(--success))" strokeDasharray="3 3" strokeWidth={1}
                label={{ value: `Max ${max.toFixed(1)}`, position: "right", fill: "hsl(var(--success))", fontSize: 10 }} />

              <RechartsTooltip content={<CustomTooltip />} cursor={false} />

              <Scatter data={data} onClick={(entry: any) => onAthleteClick(entry.profileId, entry.name)}>
                {data.map((d, i) => (
                  <Cell key={i} fill="hsl(var(--primary))" r={8} className="cursor-pointer" stroke="hsl(var(--primary-foreground))" strokeWidth={2} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Stats summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Statistical Summary</h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Mean Score</p>
            <p className="text-2xl font-bold text-primary">{mean.toFixed(1)}<span className="text-sm text-muted-foreground">/6</span></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Standard Deviation</p>
            <p className="text-2xl font-bold text-foreground">{stdDev.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {stdDev < 0.5 ? "Very consistent" : stdDev < 1 ? "Moderately consistent" : "Widely varied"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Team Range</p>
            <p className="text-2xl font-bold text-foreground">{range.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{min.toFixed(1)} – {max.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Athletes Tracked</p>
            <p className="text-2xl font-bold text-foreground">{data.length}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
