import { useState, useMemo } from "react";
import { motion } from "framer-motion";
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

export default function TeamPerformanceRankings({ results, tests, onAthleteClick, selectedTestId, onTestChange }: Props) {
  const [showOverview, setShowOverview] = useState(false);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string>("all");

  const testId = selectedTestId || tests[0]?.id;
  const testInfo = tests.find(t => t.id === testId);

  // All results for this test, newest first
  const allTestResults = useMemo(
    () => results
      .filter(r => r.test_id === testId)
      .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()),
    [results, testId]
  );

  // Unique session dates (chronological - oldest = Session 1)
  const sessions = useMemo(() => {
    const dates = Array.from(new Set(allTestResults.map((r: any) => r.session_date as string)));
    const asc = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return asc.map((date, i) => ({ date, number: i + 1 }));
  }, [allTestResults]);

  // Reset session selection when test changes (if invalid)
  const validSession = selectedSessionDate === "all" || sessions.some(s => s.date === selectedSessionDate);
  const effectiveSession = validSession ? selectedSessionDate : "all";

  // Results filtered by selected session (or all)
  const sessionResults = effectiveSession === "all"
    ? allTestResults
    : allTestResults.filter((r: any) => r.session_date === effectiveSession);

  // For rankings: latest entry per athlete within the filtered set
  const latestByAthlete = new Map<string, { value: number; prevValue: number | null; name: string; profileId: string; wellness: number | null; date: string }>();
  const groupedFiltered = new Map<string, any[]>();
  sessionResults.forEach((r: any) => {
    if (!groupedFiltered.has(r.profile_id)) groupedFiltered.set(r.profile_id, []);
    groupedFiltered.get(r.profile_id)!.push(r);
  });

  // For delta calculation, we need the previous result *across all sessions*
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

  // Top 3 All-Time (across every session for this test)
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

  const cards = [
    { title: "Best Performances", icon: Trophy, data: sortedByValue.slice(0, 5), showValue: true, accent: "text-primary" },
    { title: "Lowest Performances", icon: AlertTriangle, data: [...sortedByValue].reverse().slice(0, 5), showValue: true, accent: "text-warning" },
    { title: "Best Improvements", icon: TrendingUp, data: sortedByDelta.slice(0, 5), showValue: false, accent: "text-success" },
    { title: "Biggest Drops", icon: TrendingDown, data: [...sortedByDelta].reverse().slice(0, 5), showValue: false, accent: "text-destructive" },
  ];

  // Overview rows: simple, non-ranked, alphabetical by name
  const overviewRows = Array.from(latestByAthlete.values())
    .map(a => ({
      profileId: a.profileId,
      name: a.name,
      value: a.value,
      wellness: a.wellness,
      date: a.date,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sessionLabel = effectiveSession === "all"
    ? "All Sessions"
    : (() => {
        const s = sessions.find(s => s.date === effectiveSession);
        return s ? `Session ${s.number} : ${formatDate(s.date)}` : formatDate(effectiveSession);
      })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Performance Rankings</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOverview(v => !v)}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            {showOverview ? <X className="mr-1.5 h-3.5 w-3.5" /> : <ClipboardList className="mr-1.5 h-3.5 w-3.5" />}
            {showOverview ? "Hide Overview" : "View Session Overview"}
          </Button>
          <Select value={testId || ""} onValueChange={(v) => { onTestChange(v); setSelectedSessionDate("all"); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={effectiveSession} onValueChange={setSelectedSessionDate}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {[...sessions].reverse().map(s => (
                <SelectItem key={s.date} value={s.date}>
                  Session {s.number} : {formatDate(s.date)}
                </SelectItem>
              ))}
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
              <button
                key={r.id}
                onClick={() => onAthleteClick(r.profileId, r.name)}
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-left transition-colors hover:bg-primary/10"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{r.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(r.date)}</span>
                    <span>·</span>
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
                    <tr
                      key={r.profileId}
                      onClick={() => onAthleteClick(r.profileId, r.name)}
                      className="cursor-pointer border-b border-border/30 transition-colors hover:bg-secondary/40"
                    >
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((card, ci) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * ci }} className="glass-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <card.icon className={`h-5 w-5 ${card.accent}`} />
                <h3 className="font-semibold text-foreground">{card.title}</h3>
              </div>
              {card.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-1.5">
                  {card.data.map((a, i) => (
                    <button key={a.profileId} onClick={() => onAthleteClick(a.profileId, a.name)}
                      className="flex w-full items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-5 shrink-0 text-center font-bold text-muted-foreground">{i + 1}</span>
                        <span className="truncate font-medium text-foreground">{a.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <WellnessChip score={a.wellness} />
                        {card.showValue ? (
                          <span className={`font-bold ${card.accent}`}>{a.value} {a.unit}</span>
                        ) : (
                          <span className={`font-bold ${(a.delta ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                            {(a.delta ?? 0) > 0 ? "+" : ""}{a.delta}%
                          </span>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
