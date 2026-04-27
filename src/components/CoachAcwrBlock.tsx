import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCoachFocus } from "@/contexts/CoachFocusContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowRight, HelpCircle, TrendingDown, TrendingUp, Minus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  computeAcwr, currentWeekRange, dailyLoadSeries, weeklyLoadByType,
  getZone, SESSION_TYPES, SESSION_TYPE_LABELS, type SessionLoad, type AcwrInfo,
} from "@/lib/acwr";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, BarChart, Bar, Legend,
} from "recharts";

type AthleteAcwr = {
  profileId: string;
  name: string;
  loads: SessionLoad[];
  acwr: AcwrInfo;
};

const TYPE_COLORS: Record<string, string> = {
  strength: "hsl(var(--primary))",
  conditioning: "hsl(199 89% 55%)",
  technical: "hsl(262 70% 60%)",
  match: "hsl(0 84% 60%)",
  recovery: "hsl(142 71% 45%)",
};

function TrendArrow({ trend }: { trend: AcwrInfo["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-success" />;
  if (trend === "flat") return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return <span className="text-muted-foreground">—</span>;
}

export default function CoachAcwrBlock({ profileIds }: { profileIds: string[] }) {
  const { role } = useAuth();
  const { focus } = useCoachFocus();
  const [showFull, setShowFull] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [detailAthlete, setDetailAthlete] = useState<AthleteAcwr | null>(null);

  const week = currentWeekRange();

  // Coach-only: short-circuit if not coach
  const enabled = role === "coach" && profileIds.length > 0;

  const { data: rows } = useQuery({
    queryKey: ["session-loads-acwr", profileIds],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 35);
      const { data } = await supabase
        .from("session_loads")
        .select("id, profile_id, session_date, session_type, rpe, duration_min, profiles(name)")
        .in("profile_id", profileIds)
        .gte("session_date", since.toISOString().slice(0, 10))
        .order("session_date", { ascending: false });
      return data || [];
    },
    enabled,
  });

  const athletes: AthleteAcwr[] = useMemo(() => {
    if (!rows || !profileIds.length) return [];
    const grouped = new Map<string, { name: string; loads: SessionLoad[] }>();
    rows.forEach((r: any) => {
      const id = r.profile_id;
      if (!grouped.has(id)) grouped.set(id, { name: r.profiles?.name || "Athlete", loads: [] });
      grouped.get(id)!.loads.push({
        id: r.id, profile_id: id, session_date: r.session_date,
        session_type: r.session_type, rpe: r.rpe, duration_min: r.duration_min,
      });
    });
    // include athletes with no data yet
    profileIds.forEach((id) => {
      if (!grouped.has(id)) grouped.set(id, { name: "—", loads: [] });
    });
    return Array.from(grouped.entries()).map(([profileId, g]) => ({
      profileId, name: g.name, loads: g.loads, acwr: computeAcwr(g.loads),
    })).filter((a) => a.name !== "—" || a.loads.length > 0)
      .sort((a, b) => (b.acwr.ratio ?? -1) - (a.acwr.ratio ?? -1));
  }, [rows, profileIds]);

  if (role !== "coach") return null;

  const counts = athletes.reduce((acc, a) => {
    if (a.acwr.ratio === null) acc.grey += 1;
    else acc[a.acwr.zone] += 1;
    return acc;
  }, { red: 0, yellow: 0, green: 0, grey: 0 } as Record<string, number>);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-4 md:p-5">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Training Load — ACWR</h3>
            <span className="text-xs text-muted-foreground">· {week.label}</span>
            <button onClick={() => setShowInfo(true)}
              className="text-muted-foreground transition-colors hover:text-primary" aria-label="ACWR info">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Zone counts */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">🔴 {counts.red}</span>
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-yellow-600 dark:text-yellow-400">🟡 {counts.yellow}</span>
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">🟢 {counts.green}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">⚫ {counts.grey}</span>
          </div>
        </div>

        {/* Athlete chips */}
        {athletes.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            No session load data yet. Use <span className="font-medium text-foreground">Session Load</span> to log RPE × duration.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {athletes.map((a) => {
              const z = getZone(a.acwr.ratio);
              return (
                <button key={a.profileId} onClick={() => setDetailAthlete(a)}
                  className="group flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-xs transition-all hover:scale-105 hover:border-primary/40"
                  style={{ borderLeftColor: z.color, borderLeftWidth: 3 }}>
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span className="font-bold" style={{ color: z.color }}>
                    {a.acwr.ratio ?? "—"}
                  </span>
                  <span className="text-[10px]">{z.emoji}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowFull(true)}
            className="h-7 text-xs">
            View Full Report <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </motion.div>

      {/* Full Report Modal */}
      <Dialog open={showFull} onOpenChange={setShowFull}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Training Load — Full Report
              <span className="text-sm font-normal text-muted-foreground">· {week.label}</span>
            </DialogTitle>
          </DialogHeader>
          <FullReport athletes={athletes} onAthleteClick={setDetailAthlete} />
        </DialogContent>
      </Dialog>

      {/* Individual Athlete Detail */}
      <Dialog open={!!detailAthlete} onOpenChange={(o) => !o && setDetailAthlete(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {detailAthlete && <AthleteDetail athlete={detailAthlete} onInfo={() => setShowInfo(true)} />}
        </DialogContent>
      </Dialog>

      {/* Info Modal */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>About ACWR</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">ACWR</strong> (Acute:Chronic Workload Ratio) compares this week's training load to the average of the last 4 weeks.</p>
            <ul className="space-y-1">
              <li><strong className="text-foreground">Acute Load</strong> = sum of AU (RPE × duration) over last 7 days</li>
              <li><strong className="text-foreground">Chronic Load</strong> = average weekly AU over last 4 weeks</li>
              <li><strong className="text-foreground">ACWR</strong> = Acute / Chronic</li>
            </ul>
            <div className="space-y-1.5 pt-2">
              <div>⚫ <strong>&lt; 0.8</strong> — Undertraining</div>
              <div>🟢 <strong>0.8 – 1.3</strong> — Optimal</div>
              <div>🟡 <strong>1.3 – 1.5</strong> — Elevated, monitor closely</div>
              <div>🔴 <strong>&gt; 1.5</strong> — High spike, injury risk increased</div>
            </div>
            <p className="pt-2 text-xs italic">Disclaimer: ACWR is a guideline and should be cross-checked with subjective feedback, sleep, and wellness data. Minimum 4 weeks of history required for reliable interpretation.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FullReport({ athletes, onAthleteClick }: { athletes: AthleteAcwr[]; onAthleteClick: (a: AthleteAcwr) => void }) {
  const counts = athletes.reduce((acc, a) => {
    if (a.acwr.ratio === null) acc.grey += 1;
    else acc[a.acwr.zone] += 1;
    return acc;
  }, { red: 0, yellow: 0, green: 0, grey: 0 } as Record<string, number>);

  // Aggregate weekly load by type across team
  const allLoads = athletes.flatMap((a) => a.loads);
  const { data: weeklyData } = weeklyLoadByType(allLoads, 4);

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-2">
        <SummaryPill label="High risk" emoji="🔴" count={counts.red} color="text-destructive bg-destructive/10" />
        <SummaryPill label="Elevated" emoji="🟡" count={counts.yellow} color="text-yellow-600 dark:text-yellow-400 bg-yellow-500/10" />
        <SummaryPill label="Optimal" emoji="🟢" count={counts.green} color="text-success bg-success/10" />
        <SummaryPill label="Under" emoji="⚫" count={counts.grey} color="text-muted-foreground bg-muted" />
      </div>

      {/* Heatmap table */}
      <div className="rounded-xl border border-border">
        <div className="border-b border-border bg-secondary/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Athletes — sorted by ACWR (highest first)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2">Athlete</th>
                <th className="px-2 py-2">Acute</th>
                <th className="px-2 py-2">Chronic</th>
                <th className="px-2 py-2">ACWR</th>
                <th className="px-2 py-2">Zone</th>
                <th className="px-2 py-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => {
                const z = getZone(a.acwr.ratio);
                return (
                  <tr key={a.profileId} onClick={() => onAthleteClick(a)}
                    className="cursor-pointer border-b border-border/40 transition-colors hover:bg-secondary/40">
                    <td className="px-4 py-2 font-medium text-foreground">{a.name}</td>
                    <td className="px-2 py-2">{a.acwr.acute}</td>
                    <td className="px-2 py-2">{a.acwr.chronic}</td>
                    <td className="px-2 py-2 font-bold" style={{ color: z.color }}>{a.acwr.ratio ?? "—"}</td>
                    <td className="px-2 py-2">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${z.color}20`, color: z.color }}>
                        {z.emoji} {z.label.split(" — ")[0]}
                      </span>
                    </td>
                    <td className="px-2 py-2"><TrendArrow trend={a.acwr.trend} /></td>
                  </tr>
                );
              })}
              {athletes.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grouped bar chart */}
      <div className="rounded-xl border border-border p-4">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Team load by session type — last 4 weeks</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {SESSION_TYPES.map((t) => (
                <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]} name={SESSION_TYPE_LABELS[t]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, emoji, count, color }: { label: string; emoji: string; count: number; color: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${color}`}>
      <div className="text-2xl font-bold">{emoji} {count}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function AthleteDetail({ athlete, onInfo }: { athlete: AthleteAcwr; onInfo: () => void }) {
  const z = getZone(athlete.acwr.ratio);
  const series = dailyLoadSeries(athlete.loads, 28);
  const chronicDaily = athlete.acwr.chronic / 7;

  // gauge marker position (0..2.0 scale)
  const ratio = athlete.acwr.ratio ?? 0;
  const markerPct = Math.min(100, (ratio / 2) * 100);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {athlete.name}
          <button onClick={onInfo} className="text-muted-foreground hover:text-primary">
            <HelpCircle className="h-4 w-4" />
          </button>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* ACWR + gauge */}
        <div className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold" style={{ color: z.color }}>
                {athlete.acwr.ratio ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground">ACWR</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium" style={{ color: z.color }}>{z.emoji} {z.label}</div>
              <div className="text-xs text-muted-foreground">
                Acute {athlete.acwr.acute} · Chronic {athlete.acwr.chronic} <TrendArrow trend={athlete.acwr.trend} />
              </div>
            </div>
          </div>
          {/* Gauge */}
          <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full"
            style={{
              background: `linear-gradient(to right,
                hsl(var(--muted-foreground)) 0%, hsl(var(--muted-foreground)) 40%,
                hsl(142 71% 45%) 40%, hsl(142 71% 45%) 65%,
                hsl(45 93% 50%) 65%, hsl(45 93% 50%) 75%,
                hsl(0 84% 60%) 75%, hsl(0 84% 60%) 100%)`,
            }}>
            {athlete.acwr.ratio !== null && (
              <div className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-lg"
                style={{ left: `${markerPct}%` }} />
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0</span><span>0.8</span><span>1.3</span><span>1.5</span><span>2.0+</span>
          </div>
          {athlete.acwr.insufficient && (
            <p className="mt-2 text-xs italic text-muted-foreground">
              Insufficient history — minimum 4 weeks required for reliable interpretation.
            </p>
          )}
        </div>

        {/* Daily load chart */}
        <div className="rounded-xl border border-border p-4">
          <h4 className="mb-2 text-sm font-semibold text-foreground">Daily load — last 28 days</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10}
                  tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <ReferenceArea y1={chronicDaily * 0.8} y2={chronicDaily * 1.3}
                  fill="hsl(var(--primary))" fillOpacity={0.08} />
                <Line type="monotone" dataKey="au" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Shaded band = chronic load baseline (0.8–1.3× daily chronic average)
          </p>
        </div>
      </div>
    </>
  );
}
