import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from "recharts";
import { Activity, ExternalLink } from "lucide-react";

interface WellnessPoint {
  profileId: string;
  name: string;
  score: number;
  sleep: number;
  soreness: number;
  fatigue: number;
  periodPain: number;
  hasPeriodPain: boolean;
  x: number;
}

interface Props {
  results: any[];
  onAthleteClick: (profileId: string, name: string) => void;
}

export default function TeamWellnessChart({ results, onAthleteClick }: Props) {
  const [pinned, setPinned] = useState<WellnessPoint | null>(null);

  const data = useMemo(() => {
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
      periodPain: Number(r.wellness_period_pain || 0),
      hasPeriodPain: r.wellness_period_pain != null && r.wellness_period_pain > 0,
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

  const getStatusLabel = useCallback((score: number) => {
    if (score > mean + stdDev) return { label: "Well Above Avg", color: "text-success" };
    if (score > mean) return { label: "Above Average", color: "text-success" };
    if (score < mean - stdDev) return { label: "Well Below Avg", color: "text-destructive" };
    if (score < mean) return { label: "Below Average", color: "text-warning" };
    return { label: "Average", color: "text-muted-foreground" };
  }, [mean, stdDev]);

  const handleDotClick = useCallback((_: any, entry: any) => {
    const point = entry?.payload || entry;
    if (point?.profileId) {
      setPinned(prev => prev?.profileId === point.profileId ? null : point);
    }
  }, []);

  // Custom tooltip that shows on hover (recharts native) + pinned popover
  function HoverTooltip({ active, payload }: any) {
    if (pinned) return null; // Don't show hover tooltip when pinned
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as WellnessPoint;
    const status = getStatusLabel(d.score);
    return <TooltipCard point={d} status={status} />;
  }

  function TooltipCard({ point, status, showAction }: { point: WellnessPoint; status: { label: string; color: string }; showAction?: boolean }) {
    return (
      <div className="rounded-xl border border-primary/30 bg-background px-4 py-3 text-xs shadow-2xl"
        style={{ minWidth: 200 }}>
        <div className="mb-2 flex items-center justify-between border-b border-primary/20 pb-2">
          <p className="font-bold text-foreground">{point.name}</p>
          <span className={`text-[10px] font-semibold uppercase ${status.color}`}>{status.label}</span>
        </div>
        <div className="mb-2">
          <span className="text-muted-foreground">Wellness: </span>
          <span className="text-base font-bold text-primary">{point.score.toFixed(1)}</span>
          <span className="text-muted-foreground">/6</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
          <span>Sleep</span><span className="text-right font-medium text-foreground">{point.sleep}/6</span>
          <span>Soreness</span><span className="text-right font-medium text-foreground">{point.soreness}/6</span>
          <span>Fatigue</span><span className="text-right font-medium text-foreground">{point.fatigue}/6</span>
          {point.hasPeriodPain && (
            <>
              <span>Period Pain</span><span className="text-right font-medium text-foreground">{point.periodPain}/6</span>
            </>
          )}
        </div>
        {showAction && (
          <button
            onClick={(e) => { e.stopPropagation(); onAthleteClick(point.profileId, point.name); }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            View Full Profile <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

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
        className="glass-card relative rounded-2xl p-5 lg:col-span-3">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Team Readiness Distribution</h2>
        <p className="mb-2 text-xs text-muted-foreground">Click a dot to pin details · Click again to dismiss</p>
        <div className="relative h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" dataKey="x" domain={[0, data.length + 1]} tick={false}
                label={{ value: "Athletes", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis type="number" dataKey="score" domain={[0, 6.5]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                label={{ value: "Wellness Score", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />

              <ReferenceArea y1={Math.max(0, mean - stdDev)} y2={Math.min(6, mean + stdDev)}
                fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeOpacity={0} />
              <ReferenceLine y={mean} stroke="hsl(var(--primary))" strokeDasharray="6 3" strokeWidth={2}
                label={{ value: `Mean ${mean.toFixed(1)}`, position: "right", fill: "hsl(var(--primary))", fontSize: 11 }} />
              <ReferenceLine y={min} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeWidth={1}
                label={{ value: `Min ${min.toFixed(1)}`, position: "right", fill: "hsl(var(--destructive))", fontSize: 10 }} />
              <ReferenceLine y={max} stroke="hsl(var(--success))" strokeDasharray="3 3" strokeWidth={1}
                label={{ value: `Max ${max.toFixed(1)}`, position: "right", fill: "hsl(var(--success))", fontSize: 10 }} />

              <RechartsTooltip content={<HoverTooltip />} cursor={false} />

              <Scatter data={data} onClick={handleDotClick}>
                {data.map((d, i) => (
                  <Cell key={i}
                    fill={pinned?.profileId === d.profileId ? "hsl(var(--primary))" : "hsl(var(--primary))"}
                    r={pinned?.profileId === d.profileId ? 10 : 8}
                    className="cursor-pointer"
                    stroke={pinned?.profileId === d.profileId ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))"}
                    strokeWidth={pinned?.profileId === d.profileId ? 3 : 2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Pinned popover */}
          {pinned && (
            <div className="absolute right-4 top-4 z-50 animate-in fade-in-0 zoom-in-95">
              <TooltipCard point={pinned} status={getStatusLabel(pinned.score)} showAction />
              <button onClick={() => setPinned(null)}
                className="mt-1 w-full text-center text-[10px] text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            </div>
          )}
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
