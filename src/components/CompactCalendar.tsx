import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const FAMILY_COLORS: Record<string, string> = {
  strength: "bg-primary",
  weightlifting: "bg-primary",
  streetlifting: "bg-primary",
  jumps: "bg-green-500",
  sprints: "bg-blue-400",
  change_of_direction: "bg-green-500",
  vma: "bg-blue-500",
  run: "bg-blue-500",
  anthropometric: "bg-muted-foreground",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + monOffset);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

interface Props {
  profileIds: string[];
}

export default function CompactCalendar({ profileIds }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const weekDays = useMemo(getWeekDays, []);
  const startDate = formatDateStr(weekDays[0]);
  const endDate = formatDateStr(weekDays[6]);
  const todayStr = formatDateStr(new Date());

  const { data: results } = useQuery({
    queryKey: ["compact-cal-results", profileIds, startDate, endDate],
    queryFn: async () => {
      if (!profileIds.length) return [];
      const { data } = await supabase
        .from("results")
        .select("session_date, value, test_id, test_library(name, family, unit)")
        .in("profile_id", profileIds)
        .gte("session_date", startDate)
        .lte("session_date", endDate);
      return data || [];
    },
    enabled: profileIds.length > 0,
  });

  const { data: events } = useQuery({
    queryKey: ["compact-cal-events", profileIds, startDate, endDate],
    queryFn: async () => {
      if (!profileIds.length) return [];
      const { data } = await supabase
        .from("scheduled_events")
        .select("*")
        .in("profile_id", profileIds)
        .gte("event_date", startDate)
        .lte("event_date", endDate);
      return data || [];
    },
    enabled: profileIds.length > 0,
  });

  const resultsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    results?.forEach((r: any) => {
      if (!map.has(r.session_date)) map.set(r.session_date, []);
      map.get(r.session_date)!.push(r);
    });
    return map;
  }, [results]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    events?.forEach((e: any) => {
      if (!map.has(e.event_date)) map.set(e.event_date, []);
      map.get(e.event_date)!.push(e);
    });
    return map;
  }, [events]);

  const weekRangeLabel = `${weekDays[0].toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${weekDays[6].toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">This week</span>
          <span className="text-xs text-muted-foreground truncate">{weekRangeLabel}</span>
          {collapsed && (
            <div className="ml-2 hidden sm:flex items-center gap-1">
              {weekDays.map((d) => {
                const ds = formatDateStr(d);
                const dayResults = resultsByDate.get(ds) || [];
                const dayEvents = eventsByDate.get(ds) || [];
                const dotColors = new Set<string>();
                dayResults.forEach((r: any) => {
                  const fam = r.test_library?.family;
                  if (fam && FAMILY_COLORS[fam]) dotColors.add(FAMILY_COLORS[fam]);
                });
                const hasAny = dotColors.size > 0 || dayEvents.length > 0;
                return (
                  <span key={ds} className="flex items-center justify-center h-3 w-3">
                    {hasAny ? (
                      <span className={`h-1.5 w-1.5 rounded-full ${Array.from(dotColors)[0] || "bg-primary"}`} />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary hover:text-primary"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" /> Expand
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" /> Collapse
            </>
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-7 gap-1.5 mt-3">
              {weekDays.map((d, i) => {
                const ds = formatDateStr(d);
                const isToday = ds === todayStr;
                const dayResults = resultsByDate.get(ds) || [];
                const dayEvents = eventsByDate.get(ds) || [];
                const dotColors = new Set<string>();
                dayResults.forEach((r: any) => {
                  const fam = r.test_library?.family;
                  if (fam && FAMILY_COLORS[fam]) dotColors.add(FAMILY_COLORS[fam]);
                });
                const hasScheduled = dayEvents.length > 0;
                const hasContent = dayResults.length > 0 || hasScheduled;

                return (
                  <Popover key={ds}>
                    <PopoverTrigger asChild>
                      <button
                        className={`relative flex flex-col items-center justify-center rounded-xl py-2 transition-all
                          ${isToday ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/40 hover:bg-secondary/70"}
                        `}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground">{DAY_LABELS[i]}</span>
                        <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                          {d.getDate()}
                        </span>
                        {(dotColors.size > 0 || hasScheduled) && (
                          <div className="mt-1 flex items-center gap-0.5">
                            {Array.from(dotColors).slice(0, 3).map((c, ci) => (
                              <span key={ci} className={`h-1.5 w-1.5 rounded-full ${c}`} />
                            ))}
                            {hasScheduled && <Bell className="h-2.5 w-2.5 text-primary" />}
                          </div>
                        )}
                      </button>
                    </PopoverTrigger>
                    {hasContent && (
                      <PopoverContent className="w-60 p-3 text-xs" align="center">
                        <p className="font-semibold text-foreground mb-2">
                          {d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                        </p>
                        {dayResults.length > 0 && (
                          <div className="mb-2">
                            <p className="text-muted-foreground mb-1">Completed</p>
                            {dayResults.map((r: any, ri: number) => (
                              <div key={ri} className="flex items-center gap-2 py-0.5">
                                <span className={`h-2 w-2 rounded-full ${FAMILY_COLORS[r.test_library?.family] || "bg-muted-foreground"}`} />
                                <span className="text-foreground truncate">{r.test_library?.name}</span>
                                <span className="ml-auto text-muted-foreground">{r.value} {r.test_library?.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {dayEvents.length > 0 && (
                          <div>
                            <p className="text-muted-foreground mb-1">Scheduled</p>
                            {dayEvents.map((ev: any) => (
                              <div key={ev.id} className="flex items-center gap-2 py-0.5">
                                <Bell className="h-2.5 w-2.5 text-primary" />
                                <span className="text-foreground truncate">{ev.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
