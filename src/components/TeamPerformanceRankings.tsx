import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Trophy, AlertTriangle, ChevronRight, ClipboardList, X, Crown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AthleteScore {
  profileId: string;
  name: string;
  value: number;
  unit: string;
  delta: number | null;
  wellness: number | null;
  date: string;
}

interface Props {
  results: any[];
  tests: { id: string; name: string; unit: string; family: string }[];
  onAthleteClick: (profileId: string, name: string) => void;
  selectedTestId: string | null;
  onTestChange: (testId: string) => void;
}

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function WellnessChip({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const rounded = Math.round(score);
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
      {rounded}
    </span>
  );
}

interface CompactCardProps {
  title: string;
  icon: React.ElementType;
  accent: string;
  top1: AthleteScore | null;
  top5: AthleteScore[];
  showValue: boolean;
  unit: string;
  onAthleteClick: (profileId: string, name: string) => void;
}

function CompactCard({ title, icon: Icon, accent, top1, top5, showValue, unit, onAthleteClick }: CompactCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="glass-card cursor-pointer rounded-2xl transition-shadow hover:shadow-lg"
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon className={`h-5 w-5 shrink-0 ${accent}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {top1 ? (
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{top1.name}</span>
              <span className={`shrink-0 text-sm font-bold ${accent}`}>
                {showValue ? `${top1.value} ${unit}` : `${(top1.delta ?? 0) > 0 ? "+" : ""}${top1.delta}%`}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      <AnimatePresence>
        {expanded && top5.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-t border-border/40 px-4 py-2 space-y-1">
              <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Top 5 Results</p>
              {top5.map((a, i) => (
                <button
                  key={a.profileId}
                  onClick={() => onAthleteClick(a.profileId, a.name)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/60"
                >
                  <span className="w-4 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{a.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(a.date)}</span>
                  {showValue ? (
                    <span className={`shrink-0 text-xs font-bold ${accent}`}>{a.value} {a.unit}</span>
                  ) : (
                    <span className={`shrink-0 text-xs font-bold ${(a.delta ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      {(a.delta ?? 0) > 0 ? "+" : ""}{a.delta}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TeamPerformanceRankings({ results, tests, onAthleteClick, selectedTestId, onTestChange }: Props) {
  const [showOverview, setShowOverview] = useState(false);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string>("all");

  const testId = selectedTestId || tests[0]?.id;
  const testInfo = tests.find(t => t.id === testId);

  const allTestResults = useMemo(
    () => results
      .filter(r => r.test_id === testId)
      .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()),
    [results, testId]
  );

  const sessions = useMemo(() => {
    const dates = Array.from(new Set(allTestResults.map((r: any) => r.session_date as string)));
    const asc = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return asc.map((date, i) => ({ date, number: i + 1 }));
  }, [allTestResults]);

  const validSession = selectedSessionDate === "all" || sessions.some(s => s.date === selectedSessionDate);
  const effectiveSession = validSession ? selectedSessionDate : "all";

  const sessionResults = effectiveSession === "all"
    ? allTestResults
    : allTestResults.filter((r: any) => r.session_date === effectiveSession);

  const latestByAthlete = new Map<string, { value: number; prevValue: number | null; name: string; profileId: string; wellness: number | null; date: string }>();
  const groupedFiltered = new Map<string, any[]>();
  sessionResults.forEach((r: any) => {
    if (!groupedFiltered.has(r.profile_id)) groupedFiltered.set(r.profile_id, []);
    groupedFiltered.get(r.profile_id)!.push(r);
  });

  const groupedAll = new Map<string, any[]>();
  allTestResults.forEach((r: any) => {
    if (!groupedAll.has(r.profile_id)) groupedAll.set(r.profile_id, []);
    groupedAll.get(r.profile_id)!.push(r);
  });

  groupedFiltered.forEach((recs, profileId) => {
    const latest = recs[0];
    const allRecs = groupedAll.get(profileId) || [];
    const latestIdx = allRecs.findIndex(r => r.id === latest.id);
    const prev = latestIdx >= 0 && latestIdx < allRecs.length - 1 ? allRecs[latestIdx + 1] : null;
    latestByAthlete.set(profileId, {
      value: Number(latest.value),
      prevValue: prev ? Number(prev.value) : null,
      name: latest.profiles?.name || "Unknown",
      profileId,
      wellness: latest.wellness_score !== null && latest.wellness_score !== undefined ? Number(latest.wellness_score) : null,
      date: latest.session_date,
    });
  });

  const athletes: AthleteScore[] = Array.from(latestByAthlete.values()).map(a => ({
    profileId: a.profileId,
    name: a.name,
    value: a.value,
    unit: testInfo?.unit || "",
    delta: a.prevValue !== null ? Math.round(((a.value - a.prevValue) / a.prevValue) * 100 * 10) / 10 : null,
    wellness: a.wellness,
    date: a.date,
  }));

  const sortedByValue = [...athletes].sort((a, b) => b.value - a.value);
  const sortedByDelta = [...athletes].filter(a => a.delta !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  const topAllTime = useMemo(() => {
    return [...allTestResults]
      .sort((a: any, b: any) => Number(b.value) - Number(a.value))
      .slice(0, 3)
      .map((r: any) => ({
        id: r.id,
        profileId: r.profile_id,
        name: r.profiles?.name || "Unknown",
        value: Number(r.value),
        date: r.session_date,
        wellness: r.wellness_score !== null && r.wellness_score !== undefined ? Number(r.wellness_score) : null,
      }));
  }, [allTestResults]);

  const cards: CompactCardProps[] = [
    { title: "Best Performance", icon: Trophy, accent: "text-primary", top1: sortedByValue[0] || null, top5: sortedByValue.slice(0, 5), showValue: true, unit: testInfo?.unit || "", onAthleteClick },
    { title: "Lowest Performance", icon: AlertTriangle, accent: "text-warning", top1: [...sortedByValue].reverse()[0] || null, top5: [...sortedByValue].reverse().slice(0, 5), showValue: true, unit: testInfo?.unit || "", onAthleteClick },
    { title: "Best Improvement", icon: TrendingUp, accent: "text-success", top1: sortedByDelta[0] || null, top5: sortedByDelta.slice(0, 5), showValue: false, unit: testInfo?.unit || "", onAthleteClick },
    { title: "Biggest Drop", icon: TrendingDown, accent: "text-destructive", top1: [...sortedByDelta].reverse()[0] || null, top5: [...sortedByDelta].reverse().slice(0, 5), showValue: false, unit: testInfo?.unit || "", onAthleteClick },
  ];

  const overviewRows = Array.from(latestByAthlete.values())
    .map(a => ({ profileId: a.profileId, name: a.name, value: a.value, wellness: a.wellness, date: a.date }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sessionLabel = effectiveSession === "all"
    ? "All Sessions"
    : (() => {
        const s = sessions.find(s => s.date === effectiveSession);
        return s ? `Session ${s.number} : ${formatDate(s.date)}` : formatDate(effectiveSession);
      })();

  if (!tests.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Performance Rankings</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowOverview(v => !v)} className="border-primary/40 text-primary hover:bg-primary/10">
            {showOverview ? <X className="mr-1.5 h-3.5 w-3.5" /> : <ClipboardList className="mr-1.5 h-3.5 w-3.5" />}
            {showOverview ? "Hide Overview" : "View Session Overview"}
          </Button>
          <Select value={testId || ""} onValueChange={(v) => { onTestChange(v); setSelectedSessionDate("all"); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select test" /></SelectTrigger>
            <SelectContent>{tests.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effectiveSession} onValueChange={setSelectedSessionDate}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select session" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {[...sessions].reverse().map(s => <SelectItem key={s.date} value={s.date}>Session {s.number} : {formatDate(s.date)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 All-Time */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Top 3 All-Time — {testInfo?.name}</h3>
        </div>
        {topAllTime.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {topAllTime.map((r, i) => (
              <button key={r.id} onClick={() => onAthleteClick(r.profileId, r.name)}
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-left transition-colors hover:bg-primary/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{r.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(r.date)}</span><span>·</span>
                    <span className="flex items-center gap-1">Wellness <WellnessChip score={r.wellness} /></span>
                  </div>
                </div>
                <span className="shrink-0 font-bold text-primary">{r.value} {testInfo?.unit}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {showOverview ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
          <h3 className="mb-3 font-semibold text-foreground">
            Session Overview — {testInfo?.name}{" "}
            <span className="text-sm font-normal text-muted-foreground">({sessionLabel} · {overviewRows.length} athletes)</span>
          </h3>
          {overviewRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Player</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                    <th className="px-3 py-2 font-medium">Wellness</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewRows.map(r => (
                    <tr key={r.profileId} onClick={() => onAthleteClick(r.profileId, r.name)}
                      className="cursor-pointer border-b border-border/30 transition-colors hover:bg-secondary/40">
                      <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                      <td className="px-3 py-2 font-semibold text-primary">{r.value} {testInfo?.unit}</td>
                      <td className="px-3 py-2"><WellnessChip score={r.wellness} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map((card, ci) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * ci }}>
              <CompactCard {...card} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}