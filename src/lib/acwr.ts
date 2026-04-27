// ACWR (Acute:Chronic Workload Ratio) helpers

export type SessionLoad = {
  id: string;
  profile_id: string;
  session_date: string; // YYYY-MM-DD
  session_type: string;
  rpe: number;
  duration_min: number;
};

export type AcwrZone = "grey" | "green" | "yellow" | "red";

export type AcwrInfo = {
  acute: number;       // last 7 days AU
  chronic: number;     // average weekly AU over last 4 weeks
  ratio: number | null;
  zone: AcwrZone;
  zoneLabel: string;
  zoneColor: string;   // hsl color token (semantic)
  zoneEmoji: string;
  trend: "up" | "down" | "flat" | null;
  weeksOfHistory: number;
  insufficient: boolean;
};

export const SESSION_TYPES = ["strength", "conditioning", "technical", "match", "recovery"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  strength: "Strength",
  conditioning: "Conditioning",
  technical: "Technical",
  match: "Match",
  recovery: "Recovery",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(s: string): Date {
  const d = new Date(s + "T00:00:00");
  return d;
}

export function computeAU(rpe: number, duration_min: number): number {
  return rpe * duration_min;
}

export function getZone(ratio: number | null): { zone: AcwrZone; label: string; color: string; emoji: string } {
  if (ratio === null) return { zone: "grey", label: "No data", color: "hsl(var(--muted-foreground))", emoji: "⚫" };
  if (ratio < 0.8) return { zone: "grey", label: "Undertraining", color: "hsl(var(--muted-foreground))", emoji: "⚫" };
  if (ratio <= 1.3) return { zone: "green", label: "Optimal", color: "hsl(142 71% 45%)", emoji: "🟢" };
  if (ratio < 1.5) return { zone: "yellow", label: "Elevated — monitor closely", color: "hsl(45 93% 50%)", emoji: "🟡" };
  return { zone: "red", label: "High spike — injury risk increased", color: "hsl(0 84% 60%)", emoji: "🔴" };
}

export function computeAcwr(loads: SessionLoad[], referenceDate: Date = new Date()): AcwrInfo {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const start7 = daysAgo(today, 6);   // last 7 days inclusive
  const start28 = daysAgo(today, 27); // last 28 days inclusive

  const earliestEntry = loads.reduce<Date | null>((min, l) => {
    const d = parseDate(l.session_date);
    if (!min || d < min) return d;
    return min;
  }, null);

  const weeksOfHistory = earliestEntry
    ? Math.max(0, Math.floor((today.getTime() - earliestEntry.getTime()) / (7 * DAY_MS)) + 1)
    : 0;

  let acute = 0;
  let total28 = 0;
  let prev7Total = 0;
  const start14 = daysAgo(today, 13);

  loads.forEach((l) => {
    const d = parseDate(l.session_date);
    const au = computeAU(l.rpe, l.duration_min);
    if (d >= start7 && d <= today) acute += au;
    if (d >= start28 && d <= today) total28 += au;
    if (d >= start14 && d < start7) prev7Total += au;
  });

  const chronic = total28 / 4;
  const ratio = chronic > 0 ? +(acute / chronic).toFixed(2) : null;
  const zoneInfo = getZone(ratio);

  let trend: "up" | "down" | "flat" | null = null;
  if (prev7Total > 0) {
    const diff = acute - prev7Total;
    const pct = diff / prev7Total;
    if (pct > 0.1) trend = "up";
    else if (pct < -0.1) trend = "down";
    else trend = "flat";
  }

  return {
    acute: Math.round(acute),
    chronic: Math.round(chronic),
    ratio,
    zone: zoneInfo.zone,
    zoneLabel: zoneInfo.label,
    zoneColor: zoneInfo.color,
    zoneEmoji: zoneInfo.emoji,
    trend,
    weeksOfHistory,
    insufficient: weeksOfHistory < 4,
  };
}

export function currentWeekRange(referenceDate: Date = new Date()): { start: Date; end: Date; label: string } {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (day + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

export function dailyLoadSeries(loads: SessionLoad[], days: number, referenceDate: Date = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const out: { date: string; au: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(today, i);
    const key = d.toISOString().slice(0, 10);
    const au = loads
      .filter((l) => l.session_date === key)
      .reduce((s, l) => s + computeAU(l.rpe, l.duration_min), 0);
    out.push({ date: key, au });
  }
  return out;
}

export function weeklyLoadByType(loads: SessionLoad[], weeks: number, referenceDate: Date = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const out: Record<string, number>[] = [];
  const labels: string[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = daysAgo(today, w * 7);
    const start = daysAgo(end, 6);
    labels.push(`W-${w}`);
    const bucket: Record<string, number> = { week: `W-${w}` as any };
    SESSION_TYPES.forEach((t) => (bucket[t] = 0));
    loads.forEach((l) => {
      const d = parseDate(l.session_date);
      if (d >= start && d <= end) {
        const t = (l.session_type as SessionType) || "strength";
        bucket[t] = (bucket[t] || 0) + computeAU(l.rpe, l.duration_min);
      }
    });
    out.push(bucket);
  }
  return { data: out, labels };
}
