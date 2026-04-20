import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Trophy, AlertTriangle, ChevronRight, History, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AthleteScore {
  profileId: string;
  name: string;
  value: number;
  unit: string;
  delta: number | null;
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

export default function TeamPerformanceRankings({ results, tests, onAthleteClick, selectedTestId, onTestChange }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  if (!tests.length) return null;

  const testId = selectedTestId || tests[0]?.id;
  const testInfo = tests.find(t => t.id === testId);

  const testResults = results
    .filter(r => r.test_id === testId)
    .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());

  // Group by profile_id
  const grouped = new Map<string, any[]>();
  testResults.forEach((r: any) => {
    if (!grouped.has(r.profile_id)) grouped.set(r.profile_id, []);
    grouped.get(r.profile_id)!.push(r);
  });

  const latestByAthlete = new Map<string, { value: number; prevValue: number | null; name: string; profileId: string; date: string }>();
  grouped.forEach((recs, profileId) => {
    const latest = recs[0];
    const prev = recs.length >= 2 ? recs[1] : null;
    latestByAthlete.set(profileId, {
      value: Number(latest.value),
      prevValue: prev ? Number(prev.value) : null,
      name: latest.profiles?.name || "Unknown",
      profileId,
      date: latest.session_date,
    });
  });

  const athletes: AthleteScore[] = Array.from(latestByAthlete.values()).map(a => ({
    profileId: a.profileId,
    name: a.name,
    value: a.value,
    unit: testInfo?.unit || "",
    delta: a.prevValue !== null ? Math.round(((a.value - a.prevValue) / a.prevValue) * 100 * 10) / 10 : null,
    date: a.date,
  }));

  const sortedByValue = [...athletes].sort((a, b) => b.value - a.value);
  const sortedByDelta = [...athletes].filter(a => a.delta !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  const cards = [
    { title: "Best Performances", icon: Trophy, data: sortedByValue.slice(0, 5), showValue: true, accent: "text-primary" },
    { title: "Lowest Performances", icon: AlertTriangle, data: [...sortedByValue].reverse().slice(0, 5), showValue: true, accent: "text-warning" },
    { title: "Best Improvements", icon: TrendingUp, data: sortedByDelta.slice(0, 5), showValue: false, accent: "text-success" },
    { title: "Biggest Drops", icon: TrendingDown, data: [...sortedByDelta].reverse().slice(0, 5), showValue: false, accent: "text-destructive" },
  ];

  // History: all sessions for this test, newest first
  const historyRows = testResults.map((r: any) => ({
    id: r.id,
    profileId: r.profile_id,
    name: r.profiles?.name || "Unknown",
    value: Number(r.value),
    date: r.session_date,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Performance Rankings</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(v => !v)}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            {showHistory ? <X className="mr-1.5 h-3.5 w-3.5" /> : <History className="mr-1.5 h-3.5 w-3.5" />}
            {showHistory ? "Hide History" : "View History"}
          </Button>
          <Select value={testId || ""} onValueChange={onTestChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showHistory ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
          <h3 className="mb-3 font-semibold text-foreground">
            History — {testInfo?.name} <span className="text-sm font-normal text-muted-foreground">({historyRows.length} sessions)</span>
          </h3>
          {historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="max-h-[480px] space-y-1.5 overflow-y-auto">
              {historyRows.map(r => (
                <button
                  key={r.id}
                  onClick={() => onAthleteClick(r.profileId, r.name)}
                  className="flex w-full items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{r.value} {testInfo?.unit}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
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
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(a.date)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
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
