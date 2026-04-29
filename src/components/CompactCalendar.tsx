import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp, Bell, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import DashboardCalendar from "@/components/DashboardCalendar";

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
  const dow = today.getDay();
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
  const [expanded, setExpanded] = useState(false);
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
  const weekDays = useMemo(getWeekDays, []);
  const startDate = formatDateStr(weekDays[0]);
  const endDate = formatDateStr(weekDays[6]);
  const todayStr = formatDateStr(new Date());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<string>("test");
  const [formNotes, setFormNotes] = useState("");

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
    enabled: profileIds.length > 0 && !expanded,
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
    enabled: profileIds.length > 0 && !expanded,
  });

  const createEvent = useMutation({
    mutationFn: async (ev: { title: string; event_type: string; event_date: string; notes: string }) => {
      if (!profileId) throw new Error("No profile");
      const { error } = await supabase.from("scheduled_events").insert({
        profile_id: profileId,
        title: ev.title,
        event_type: ev.event_type,
        event_date: ev.event_date,
        notes: ev.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compact-cal-events"] });
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
      queryClient.invalidateQueries({ queryKey: ["compact-cal-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({ title: "Event removed" });
    },
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

  const handleSchedule = () => {
    if (!formTitle.trim() || !selectedDate) return;
    createEvent.mutate({ title: formTitle, event_type: formType, event_date: selectedDate, notes: formNotes });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {expanded ? "Calendar" : "This week"}
          </span>
          {!expanded && (
            <span className="text-xs text-muted-foreground truncate">{weekRangeLabel}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary hover:text-primary"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" /> Show week
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" /> Show month
            </>
          )}
        </Button>
      </div>

      {/* Legend (compact) */}
      {!expanded && (
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Strength</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Cardio</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Agility</span>
          <span className="flex items-center gap-1"><Bell className="h-2.5 w-2.5" /> Scheduled</span>
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 -mx-4 -mb-4">
              {/* Reuse existing full month calendar — same schedule interaction */}
              <DashboardCalendar profileIds={profileIds} mode="athlete" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="week"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-7 gap-1.5 mt-3">
              {weekDays.map((d, i) => {
                const ds = formatDateStr(d);
                const isToday = ds === todayStr;
                const isFuture = new Date(ds) > new Date(todayStr);
                const dayResults = resultsByDate.get(ds) || [];
                const dayEvents = eventsByDate.get(ds) || [];
                const dotColors = new Set<string>();
                dayResults.forEach((r: any) => {
                  const fam = r.test_library?.family;
                  if (fam && FAMILY_COLORS[fam]) dotColors.add(FAMILY_COLORS[fam]);
                });
                const hasScheduled = dayEvents.length > 0;

                return (
                  <Popover
                    key={ds}
                    onOpenChange={(open) => {
                      if (open) {
                        setSelectedDate(ds);
                        setShowScheduleForm(false);
                      }
                    }}
                  >
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
                    <PopoverContent className="w-64 p-3 text-xs" align="center">
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
                        <div className="mb-2">
                          <p className="text-muted-foreground mb-1">Scheduled</p>
                          {dayEvents.map((ev: any) => (
                            <div key={ev.id} className="flex items-center gap-2 py-0.5">
                              <Bell className="h-2.5 w-2.5 text-primary" />
                              <span className="text-foreground truncate flex-1">{ev.title}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteEvent.mutate(ev.id); }}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {isFuture && !showScheduleForm && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-1 border-primary/30 text-primary text-xs"
                          onClick={(e) => { e.stopPropagation(); setShowScheduleForm(true); }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Schedule
                        </Button>
                      )}

                      {showScheduleForm && selectedDate === ds && (
                        <div className="mt-2 space-y-2 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
                          <Input placeholder="Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="h-7 text-xs" />
                          <Select value={formType} onValueChange={setFormType}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="test">Test</SelectItem>
                              <SelectItem value="sport_training">Sport Training</SelectItem>
                              <SelectItem value="workout">Workout</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea placeholder="Notes (optional)" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="text-xs min-h-[40px]" />
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
