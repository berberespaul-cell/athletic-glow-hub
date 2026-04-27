import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCoachFocus } from "@/contexts/CoachFocusContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { Save, Activity, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CoachFocusSelector from "@/components/CoachFocusSelector";
import { SESSION_TYPES, SESSION_TYPE_LABELS, type SessionType } from "@/lib/acwr";

interface Row {
  profileId: string;
  name: string;
  present: boolean;
  rpe: string;
  duration: string;
}

export default function SessionLoadEntry() {
  const { user, role } = useAuth();
  const { focus } = useCoachFocus();
  const qc = useQueryClient();

  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionType, setSessionType] = useState<SessionType>("strength");
  const [defaultRpe, setDefaultRpe] = useState("7");
  const [defaultDuration, setDefaultDuration] = useState("60");
  const [rows, setRows] = useState<Row[]>([]);

  const { data: athletes } = useQuery({
    queryKey: ["session-load-athletes", focus.teamId, focus.mode, user?.id],
    queryFn: async () => {
      if (focus.mode === "team" && focus.teamId) {
        const { data: members } = await supabase
          .from("team_members").select("profile_id, profiles(id, name)")
          .eq("team_id", focus.teamId);
        return (members || []).map((m: any) => ({ id: m.profiles.id, name: m.profiles.name }));
      }
      const { data } = await supabase
        .from("profiles").select("id, name").eq("coach_created_by", user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Initialize rows when athletes change
  useMemo(() => {
    if (athletes && rows.length === 0) {
      setRows(athletes.map((a) => ({
        profileId: a.id, name: a.name, present: false,
        rpe: defaultRpe, duration: defaultDuration,
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes]);

  const { data: existing, refetch: refetchExisting } = useQuery({
    queryKey: ["session-loads-day", sessionDate, sessionType, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_loads")
        .select("*, profiles(name)")
        .eq("session_date", sessionDate)
        .eq("session_type", sessionType)
        .eq("coach_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const applyDefaults = () => {
    setRows((rs) => rs.map((r) => ({ ...r, rpe: defaultRpe, duration: defaultDuration })));
  };

  const togglePresent = (id: string) => {
    setRows((rs) => rs.map((r) => r.profileId === id ? { ...r, present: !r.present } : r));
  };

  const updateRow = (id: string, key: "rpe" | "duration", val: string) => {
    setRows((rs) => rs.map((r) => r.profileId === id ? { ...r, [key]: val } : r));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const toInsert = rows
        .filter((r) => r.present && Number(r.rpe) > 0 && Number(r.duration) > 0)
        .map((r) => ({
          profile_id: r.profileId,
          coach_id: user!.id,
          session_date: sessionDate,
          session_type: sessionType,
          rpe: Number(r.rpe),
          duration_min: Number(r.duration),
        }));
      if (toInsert.length === 0) throw new Error("No athletes selected");
      const { error } = await supabase.from("session_loads").insert(toInsert);
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (count) => {
      toast({ title: "Sessions logged", description: `${count} entries saved.` });
      setRows((rs) => rs.map((r) => ({ ...r, present: false })));
      qc.invalidateQueries({ queryKey: ["session-loads-day"] });
      qc.invalidateQueries({ queryKey: ["session-loads-acwr"] });
      refetchExisting();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("session_loads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-loads-day"] });
      qc.invalidateQueries({ queryKey: ["session-loads-acwr"] });
      refetchExisting();
    },
  });

  if (role !== "coach") {
    return <div className="glass-card rounded-2xl p-6 text-muted-foreground">Coach access only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="gradient-orange flex h-10 w-10 items-center justify-center rounded-xl">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Session Load</h1>
            <p className="text-sm text-muted-foreground">Log RPE × duration per session to compute ACWR</p>
          </div>
        </div>
      </div>

      <CoachFocusSelector />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card space-y-4 rounded-2xl p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>
          <div>
            <Label>Session type</Label>
            <Select value={sessionType} onValueChange={(v) => setSessionType(v as SessionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{SESSION_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default RPE (1–10)</Label>
            <Input type="number" min={1} max={10} value={defaultRpe} onChange={(e) => setDefaultRpe(e.target.value)} />
          </div>
          <div>
            <Label>Default Duration (min)</Label>
            <Input type="number" min={1} value={defaultDuration} onChange={(e) => setDefaultDuration(e.target.value)} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={applyDefaults}>Apply defaults to all</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Athletes</h2>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="gradient-orange text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> Save sessions
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Present</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead className="w-32">RPE (1–10)</TableHead>
                <TableHead className="w-36">Duration (min)</TableHead>
                <TableHead className="w-24">AU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const au = (Number(r.rpe) || 0) * (Number(r.duration) || 0);
                return (
                  <TableRow key={r.profileId} className={r.present ? "" : "opacity-60"}>
                    <TableCell>
                      <input type="checkbox" checked={r.present} onChange={() => togglePresent(r.profileId)}
                        className="h-4 w-4 cursor-pointer accent-primary" />
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Input type="number" min={1} max={10} value={r.rpe}
                        onChange={(e) => updateRow(r.profileId, "rpe", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} value={r.duration}
                        onChange={(e) => updateRow(r.profileId, "duration", e.target.value)} />
                    </TableCell>
                    <TableCell className="font-bold text-primary">{au || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No athletes yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {existing && existing.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Already logged for {sessionDate} · {SESSION_TYPE_LABELS[sessionType]}
          </h2>
          <div className="space-y-2">
            {existing.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-2 text-sm">
                <span className="font-medium">{e.profiles?.name}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>RPE {e.rpe} × {e.duration_min}min</span>
                  <span className="font-bold text-primary">= {e.rpe * e.duration_min} AU</span>
                  <button onClick={() => deleteEntry.mutate(e.id)}
                    className="text-destructive transition-opacity hover:opacity-70">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
