import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  progressionDelta,
  coefficientOfVariation,
  isLowerBetter,
  isStrengthTest,
  isStreetlifting,
  streetliftingRelativeStrength,
  relativeForce,
  cycleDayToPhase,
  wellnessScore,
} from "@/lib/calculations";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { ArrowLeft, BarChart3, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditResultDialog from "@/components/EditResultDialog";
import { toast } from "@/hooks/use-toast";


interface Props {
  testId: string;
  testName: string;
  onBack: () => void;
  overrideProfileId?: string;
}

export default function TestDetailView({ testId, testName, onBack, overrideProfileId }: Props) {
  const { profileId: authProfileId } = useAuth();
  const profileId = overrideProfileId || authProfileId;
  const queryClient = useQueryClient();
  const [editResult, setEditResult] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: results } = useQuery({
    queryKey: ["test-results", profileId, testId],
    queryFn: async () => {
      const { data } = await supabase
        .from("results")
        .select("*, test_library(name, family, unit)")
        .eq("profile_id", profileId!)
        .eq("test_id", testId)
        .order("session_date", { ascending: true });
      return data || [];
    },
    enabled: !!profileId,
  });

  const testInfo = results?.[0]?.test_library as any;
  const family = testInfo?.family || "";
  const unit = testInfo?.unit || "";
  const isStrength = isStrengthTest(family);
  const isStreet = isStreetlifting(family);
  const profileSex = (profile as any)?.sex || "";
  const showCycle = profileSex === "female" || profileSex === "other";

  const chartData = (results || []).map((r: any, i: number) => {
    const reps = r.reps ?? 1;
    const ws =
      r.wellness_fatigue && r.wellness_sleep && r.wellness_soreness
        ? wellnessScore(r.wellness_fatigue, r.wellness_sleep, r.wellness_soreness)
        : null;
    const cycleDay = r.cycle_day ?? null;
    const phase = cycleDay ? cycleDayToPhase(cycleDay) : null;
    const delta =
      i > 0
        ? progressionDelta(Number(results![i - 1].value), Number(r.value), isLowerBetter(family))
        : 0;

    return {
      date: r.session_date,
      value: Number(r.value),
      rmLabel: isStreet
        ? `Load: ${r.value}kg`
        : isStrength
        ? reps === 1
          ? "True 1RM"
          : `Est. 1RM (${reps}r)`
        : undefined,
      wellnessScore: ws,
      cycleDay,
      phaseLabel: phase?.label || null,
      phaseColor: phase?.color || null,
      phaseName: phase?.phase || null,
      delta,
      reps,
    };
  });


  const cv = (results?.length || 0) >= 2 ? coefficientOfVariation(results!.map((r) => Number(r.value))) : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card p-3 text-sm shadow-lg min-w-[200px]">
        <p className="font-semibold text-foreground">{d.date}</p>
        <p className="font-bold text-primary">
          {d.value} {unit}
        </p>
        {d.rmLabel && <p className="text-xs text-muted-foreground">{d.rmLabel}</p>}
        {d.wellnessScore !== null && (
          <p className="text-xs text-muted-foreground">
            Wellness: <span className="font-semibold text-foreground">{d.wellnessScore}/6</span>
          </p>
        )}
        {showCycle && d.phaseLabel && (
          <p className="text-xs" style={{ color: d.phaseColor }}>
            {d.phaseLabel} — J{d.cycleDay}
          </p>
        )}
        {d.delta !== 0 && (
          <p className={`text-xs font-bold ${d.delta > 0 ? "text-success" : "text-destructive"}`}>
            {d.delta > 0 ? "+" : ""}
            {d.delta}%
          </p>
        )}
      </div>
    );
  };
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-results"] });
      queryClient.invalidateQueries({ queryKey: ["all-results"] });
      queryClient.invalidateQueries({ queryKey: ["all-results-dash"] });
      queryClient.invalidateQueries({ queryKey: ["athlete-results"] });
      toast({ title: "Result deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header with back */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{testName}</h1>
          <p className="text-sm text-muted-foreground">Performance progression & history</p>
        </div>
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" /> Progression
        </h3>

        {showCycle && chartData.some((d) => d.phaseName) && (
          <div className="mb-3 flex flex-wrap gap-3 text-xs">
            {[
              { label: "Menstrual", color: "hsl(0 84% 60%)" },
              { label: "Follicular", color: "hsl(142 71% 45%)" },
              { label: "Ovulatory", color: "hsl(38 92% 50%)" },
              { label: "Luteal", color: "hsl(270 60% 55%)" },
            ].map((p) => (
              <span key={p.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-muted-foreground">{p.label}</span>
              </span>
            ))}
          </div>
        )}

        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                {showCycle &&
                  phaseZones.map((zone, i) => (
                    <ReferenceArea key={i} x1={zone.x1} x2={zone.x2} fill={PHASE_COLORS[zone.phase] || "transparent"} fillOpacity={1} />
                  ))}
                <XAxis dataKey="date" stroke="hsl(0 0% 64%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 64%)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(14 100% 60%)"
                  strokeWidth={3}
                  dot={({ cx, cy, payload }: any) => {
                    const color = showCycle && payload.phaseColor ? payload.phaseColor : "hsl(14 100% 60%)";
                    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(14 100% 60%)" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {cv !== null && (
              <p className="mt-4 text-sm text-muted-foreground">
                <BarChart3 className="mr-1 inline h-4 w-4 text-primary" />
                Coefficient of Variation:{" "}
                <span className={`font-bold ${cv < 5 ? "text-success" : cv < 10 ? "text-warning" : "text-destructive"}`}>{cv}%</span>
                {cv < 5 ? " — Very consistent" : cv < 10 ? " — Acceptable" : " — Inconsistent"}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Not enough data for this test</p>
          </div>
        )}
      </motion.div>

      {/* History Table */}
      {results && results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Performance History</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Result</TableHead>
                  {isStrength && <TableHead>1RM</TableHead>}
                  {isStreet && <TableHead>Rel. Strength</TableHead>}
                  <TableHead>Δ%</TableHead>
                  <TableHead>Wellness</TableHead>
                  {showCycle && <TableHead>Cycle</TableHead>}
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...results].reverse().map((r: any, i: number) => {
                  const idx = results.length - 1 - i;
                  const reps = r.reps ?? 1;
                  const delta =
                    idx > 0
                      ? progressionDelta(Number(results[idx - 1].value), Number(r.value), isLowerBetter(family))
                      : null;
                  const ws =
                    r.wellness_fatigue && r.wellness_sleep && r.wellness_soreness
                      ? wellnessScore(r.wellness_fatigue, r.wellness_sleep, r.wellness_soreness)
                      : null;
                  const cycleDay = r.cycle_day ?? null;
                  const phase = cycleDay ? cycleDayToPhase(cycleDay) : null;
                  const rs =
                    isStreet && profile?.weight_kg
                      ? streetliftingRelativeStrength(Number(r.value), Number(profile.weight_kg))
                      : null;
                  const rf =
                    isStrength && !isStreet && profile?.weight_kg
                      ? relativeForce(Number(r.value), Number(profile.weight_kg))
                      : null;

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-foreground">{r.session_date}</TableCell>
                      <TableCell className="font-bold text-primary">
                        {isStreet ? `+${r.value}` : r.value} {unit}
                      </TableCell>
                      {isStrength && (
                        <TableCell className="text-muted-foreground">
                          {reps === 1 ? "True 1RM" : `Est. (${reps}r)`}
                          {rf && <span className="ml-1 text-primary">{rf}x BW</span>}
                        </TableCell>
                      )}
                      {isStreet && (
                        <TableCell className="text-muted-foreground">
                          {rs ? `${rs}x BW` : "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        {delta !== null && delta !== 0 ? (
                          <span className={`font-bold ${delta > 0 ? "text-success" : "text-destructive"}`}>
                            {delta > 0 ? "+" : ""}
                            {delta}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ws !== null ? `${ws}/6` : "—"}</TableCell>
                      {showCycle && (
                        <TableCell>
                          {phase ? (
                            <span className="text-xs" style={{ color: phase.color }}>
                              {phase.label} — J{cycleDay}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditResult(r)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(r.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* Edit Dialog */}
      {editResult && (
        <EditResultDialog
          open={!!editResult}
          onOpenChange={(open) => { if (!open) setEditResult(null); }}
          result={editResult}
          unit={unit}
          showWellness={!!editResult.wellness_fatigue}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Result</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this performance record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
