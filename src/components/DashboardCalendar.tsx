import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Bell, Plus, X, Dumbbell, Zap, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

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

const EVENT_TYPE_COLORS: Record<string, string> = {
  test: "bg-primary",
  sport_training: "bg-blue-500",
  workout: "bg-green-500",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  test: "Test",
  sport_training: "Sport Training",
  workout: "Workout",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday-based
}

function formatDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface Props {
  profileIds: string[];
  mode: "athlete" | "coach";
}

export default function DashboardCalendar({ profileIds, mode }: Props) {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<string>("test");
  const [formNotes, setFormNotes] = useState("");

  // Fetch completed results for the month
  const startDate = formatDateStr(year, month, 1);
  const endDate = formatDateStr(year, month, getDaysInMonth(year, month));

  const { data: results } = useQuery({
    queryKey: ["calendar-results", profileIds, startDate, endDate],
    queryFn: async () => {
      if (!profileIds.length) return [];
      const { data } = await supabase
        .from("results")
        .select("session_date, value, test_id, profile_id, test_library(name, family, unit)")
        .in("profile_id", profileIds)
        .gte("session_date", startDate)
        .lte("session_date", endDate);
      return data || [];
    },
    enabled: profileIds.length > 0,
  });

  const { data: events } = useQuery({
    queryKey: ["calendar-events", profileIds, startDate, endDate],
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

  const createEvent = useMutation({
    mutationFn: async (ev: { title: string; event_type: string; event_date: string; notes: string }) => {
      const targetProfile = mode === "coach" && profileIds.length > 0 ? profileIds[0] : profileId;
      if (!targetProfile) throw new Error("No profile");
      const { error } = await supabase.from("scheduled_events").insert({
        profile_id: targetProfile,
        title: ev.title,
        event_type: ev.event_type,
        event_date: ev.event_date,
        notes: ev.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({ title: "Event scheduled!" });
      setShowScheduleForm(false);
      setFormTitle("");
      setFormNotes("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({ title: "Event removed" });
    },
  });

  // Index data by date
  const resultsByDate = useMemo(() => {
    const map = new Map<string, typeof results>();
    results?.forEach(r => {
      const key = r.session_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [results]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    events?.forEach(e => {
      const key = e.event_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
    setShowScheduleForm(false);
  };

  const handleSchedule = () => {
    if (!formTitle.trim() || !selectedDate) return;
    createEvent.mutate({ title: formTitle, event_type: formType, event_date: selectedDate, notes: formNotes });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{MONTHS[month]} {year}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={goToday}>Today</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Strength</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Cardio</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Agility</span>
        <span className="flex items-center gap-1"><Bell className="h-2.5 w-2.5" /> Scheduled</span>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-px">
        {/* Empty leading cells */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9 sm:h-10" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDateStr(year, month, day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayResults = resultsByDate.get(dateStr) || [];
          const dayEvents = eventsByDate.get(dateStr) || [];
          const hasScheduled = dayEvents.length > 0;
          const isFuture = new Date(dateStr) > today;

          // Collect unique family colors from results
          const dotColors = new Set<string>();
          dayResults.forEach((r: any) => {
            const fam = r.test_library?.family;
            if (fam && FAMILY_COLORS[fam]) dotColors.add(FAMILY_COLORS[fam]);
          });

          return (
            <Popover key={day}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => handleDayClick(dateStr)}
                  className={`relative h-9 sm:h-10 rounded-lg text-xs font-medium transition-all
                    ${isToday ? "ring-1 ring-primary text-primary font-bold" : "text-foreground/80"}
                    ${isSelected ? "bg-primary/20" : "hover:bg-secondary/60"}
                    ${hasScheduled ? "border border-primary/30" : ""}
                  `}
                >
                  {day}
                  {/* Dots */}
                  {(dotColors.size > 0 || hasScheduled) && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {Array.from(dotColors).slice(0, 3).map((c, ci) => (
                        <span key={ci} className={`h-1.5 w-1.5 rounded-full ${c}`} />
                      ))}
                      {hasScheduled && <Bell className="h-2 w-2 text-primary" />}
                    </div>
                  )}
                </button>
              </PopoverTrigger>

              {(dayResults.length > 0 || dayEvents.length > 0 || isFuture) && (
                <PopoverContent className="w-64 p-3 text-xs" align="center" side="bottom">
                  <p className="font-semibold text-foreground mb-2">
                    {new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>

                  {/* Completed tests */}
                  {dayResults.length > 0 && mode === "athlete" && (
                    <div className="mb-2">
                      <p className="text-muted-foreground mb-1">Completed Tests</p>
                      {dayResults.map((r: any, ri: number) => (
                        <div key={ri} className="flex items-center gap-2 py-0.5">
                          <span className={`h-2 w-2 rounded-full ${FAMILY_COLORS[r.test_library?.family] || "bg-muted-foreground"}`} />
                          <span className="text-foreground truncate">{r.test_library?.name}</span>
                          <span className="ml-auto text-muted-foreground">{r.value} {r.test_library?.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coach summary view */}
                  {dayResults.length > 0 && mode === "coach" && (() => {
                    // Group by test
                    const byTest = new Map<string, { name: string; family: string; unit: string; values: number[] }>();
                    dayResults.forEach((r: any) => {
                      const tid = r.test_id;
                      if (!byTest.has(tid)) {
                        byTest.set(tid, {
                          name: r.test_library?.name || "Unknown",
                          family: r.test_library?.family || "",
                          unit: r.test_library?.unit || "",
                          values: [],
                        });
                      }
                      byTest.get(tid)!.values.push(Number(r.value));
                    });

                    return (
                      <div className="mb-2 space-y-2">
                        <p className="text-muted-foreground mb-1">Test Summary</p>
                        {Array.from(byTest.entries()).map(([tid, t]) => {
                          const best = Math.max(...t.values);
                          const lowest = Math.min(...t.values);
                          const avg = (t.values.reduce((a, b) => a + b, 0) / t.values.length).toFixed(1);
                          return (
                            <div key={tid} className="border border-border/50 rounded-lg p-2 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${FAMILY_COLORS[t.family] || "bg-muted-foreground"}`} />
                                <span className="font-medium text-foreground text-[11px]">{t.name}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                <Users className="h-2.5 w-2.5 inline mr-0.5" />
                                {t.values.length} Athletes tested
                              </div>
                              <div className="grid grid-cols-3 gap-1 text-[10px]">
                                <div className="text-center">
                                  <p className="text-muted-foreground">Best</p>
                                  <p className="text-green-400 font-semibold">{best} {t.unit}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-muted-foreground">Average</p>
                                  <p className="text-foreground font-semibold">{avg} {t.unit}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-muted-foreground">Lowest</p>
                                  <p className="text-red-400 font-semibold">{lowest} {t.unit}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Scheduled events */}
                  {dayEvents.length > 0 && (
                    <div className="mb-2">
                      <p className="text-muted-foreground mb-1">Scheduled</p>
                      {dayEvents.map((ev: any) => (
                        <div key={ev.id} className="flex items-center gap-2 py-0.5">
                          <span className={`h-2 w-2 rounded-full ${EVENT_TYPE_COLORS[ev.event_type] || "bg-muted-foreground"}`} />
                          <span className="text-foreground truncate flex-1">{ev.title}</span>
                          <span className="text-[10px] text-muted-foreground">{EVENT_TYPE_LABELS[ev.event_type]}</span>
                          <button onClick={(e) => { e.stopPropagation(); deleteEvent.mutate(ev.id); }} className="text-destructive hover:text-destructive/80">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Schedule button for future dates */}
                  {isFuture && !showScheduleForm && selectedDate === dateStr && (
                    <Button size="sm" variant="outline" className="w-full mt-1 border-primary/30 text-primary text-xs"
                      onClick={(e) => { e.stopPropagation(); setShowScheduleForm(true); }}>
                      <Plus className="h-3 w-3 mr-1" /> Schedule
                    </Button>
                  )}

                  {/* Schedule form */}
                  {showScheduleForm && selectedDate === dateStr && (
                    <div className="mt-2 space-y-2 border-t border-border pt-2" onClick={e => e.stopPropagation()}>
                      <Input placeholder="Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="h-7 text-xs" />
                      <Select value={formType} onValueChange={setFormType}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">Test</SelectItem>
                          <SelectItem value="sport_training">Sport Training</SelectItem>
                          <SelectItem value="workout">Workout</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea placeholder="Notes (optional)" value={formNotes} onChange={e => setFormNotes(e.target.value)} className="text-xs min-h-[40px]" />
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSchedule} disabled={!formTitle.trim()}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowScheduleForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {dayResults.length === 0 && dayEvents.length === 0 && !isFuture && (
                    <p className="text-muted-foreground">No activity</p>
                  )}
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>
    </motion.div>
  );
}
