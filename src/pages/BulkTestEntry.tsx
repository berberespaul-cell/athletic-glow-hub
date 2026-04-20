import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCoachFocus } from "@/contexts/CoachFocusContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Save, Users, AlertCircle, Info, FileDown, Plus, Sparkles, Library } from "lucide-react";
import { exportTeamSessionReport } from "@/lib/pdfExport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRecommendedTestNames, FAMILY_LABELS, FAMILY_ORDER, type TestFamily, type SportType } from "@/lib/sportTests";
import CoachFocusSelector from "@/components/CoachFocusSelector";
import TestInfoModal from "@/components/TestInfoModal";
import CreateCustomTestDialog from "@/components/CreateCustomTestDialog";

interface AthleteRow {
  profileId: string;
  name: string;
  sex: string;
  present: boolean;
  value: string;
  reps: string;
  sleep: number;
  soreness: number;
  fatigue: number;
  periodPain: number;
}

export default function BulkTestEntry() {
  const { user } = useAuth();
  const { focus } = useCoachFocus();
  const queryClient = useQueryClient();
  const [selectedTestId, setSelectedTestId] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [showTestInfo, setShowTestInfo] = useState(false);
  const [testFilter, setTestFilter] = useState<"suggested" | "all">("suggested");
  const [showCreateTest, setShowCreateTest] = useState(false);

  // Get team info (including sport)
  const { data: teamInfo } = useQuery({
    queryKey: ["team-info-bulk", focus.teamId],
    queryFn: async () => {
      if (!focus.teamId) return null;
      const { data } = await supabase.from("teams").select("sport, name").eq("id", focus.teamId).single();
      return data;
    },
    enabled: focus.mode === "team" && !!focus.teamId,
  });
  const teamSport = (teamInfo?.sport || "hybrid") as SportType;

  // Get team members for selected team
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-bulk", focus.teamId],
    queryFn: async () => {
      if (!focus.teamId) return [];
      const { data } = await supabase
        .from("team_members")
        .select("profile_id, profiles(id, name, sex)")
        .eq("team_id", focus.teamId);
      return data || [];
    },
    enabled: focus.mode === "team" && !!focus.teamId,
  });

  const { data: tests } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => {
      const { data } = await supabase.from("test_library").select("*");
      return data || [];
    },
  });

  // Initialize rows when team members change
  useMemo(() => {
    if (teamMembers?.length) {
      setRows(teamMembers.map((m: any) => ({
        profileId: m.profiles?.id || m.profile_id,
        name: m.profiles?.name || "Unknown",
        sex: m.profiles?.sex || "male",
        present: true,
        value: "",
        reps: "",
        sleep: 4,
        soreness: 4,
        fatigue: 4,
        periodPain: 1,
      })));
    }
  }, [teamMembers]);

  const selectedTest = tests?.find(t => t.id === selectedTestId);
  const isStrength = selectedTest && ["strength", "weightlifting", "streetlifting"].includes(selectedTest.family);

  const updateRow = (index: number, field: keyof AthleteRow, value: any) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  // Group tests for selector
  const groupByFamily = (testList: any[]) => {
    const grouped: Partial<Record<TestFamily, any[]>> = {};
    testList.forEach(t => {
      const fam = t.family as TestFamily;
      if (!grouped[fam]) grouped[fam] = [];
      grouped[fam]!.push(t);
    });
    return grouped;
  };

  // Sport-specific filtering
  const recommendedNames = getRecommendedTestNames(teamSport);
  const hasRecommendations = recommendedNames.length > 0;
  const suggestedTests = useMemo(() => {
    if (!tests) return [];
    const recommended = tests.filter(t => recommendedNames.includes(t.name));
    const customs = tests.filter((t: any) => t.is_custom);
    // Merge unique
    const seen = new Set<string>();
    return [...recommended, ...customs].filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tests, recommendedNames]);

  const visibleTests = testFilter === "suggested" && hasRecommendations ? suggestedTests : (tests || []);
  const visibleByFamily = groupByFamily(visibleTests);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const presentRows = rows.filter(r => r.present && r.value);
      if (presentRows.length === 0) throw new Error("No data to save");

      const inserts = presentRows.map(r => ({
        profile_id: r.profileId,
        test_id: selectedTestId,
        session_date: sessionDate,
        value: Number(r.value),
        reps: r.reps ? Number(r.reps) : null,
        wellness_fatigue: r.fatigue,
        wellness_sleep: r.sleep,
        wellness_soreness: r.soreness,
        ...(r.sex === "female" ? { wellness_period_pain: r.periodPain } : {}),
      }));

      const { error } = await supabase.from("results").insert(inserts as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-results"] });
      toast({ title: "Session saved!", description: `${rows.filter(r => r.present && r.value).length} results recorded.` });
      // Reset values
      setRows(prev => prev.map(r => ({ ...r, value: "", reps: "", present: true, sleep: 4, soreness: 4, fatigue: 4, periodPain: 1 })));
      setSelectedTestId("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (focus.mode !== "team") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Team Test Entry</h1>
        <CoachFocusSelector />
        <div className="glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Select a team from the Focus Selector above to enter bulk test data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Team Test Entry</h1>
        <p className="mt-1 text-muted-foreground">
          Enter results for <span className="font-medium text-primary">{focus.teamName}</span>
        </p>
      </div>
      <CoachFocusSelector />

      {/* Sport-aware test filter */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Test library:</span>
          {hasRecommendations ? (
            <Tabs value={testFilter} onValueChange={(v) => setTestFilter(v as "suggested" | "all")}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="suggested" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Suggested for {teamSport.charAt(0).toUpperCase() + teamSport.slice(1)}
                </TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Library className="mr-1.5 h-3.5 w-3.5" />
                  Full Library
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <span className="text-xs text-muted-foreground">Hybrid team — full library shown</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateTest(true)}
          className="border-primary/40 text-primary hover:bg-primary/10"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Custom Test
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[250px] flex-1">
          <Label className="text-muted-foreground">
            Test {testFilter === "suggested" && hasRecommendations && (
              <span className="ml-1 text-xs text-primary">(Recommended battery)</span>
            )}
          </Label>
          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
            <SelectTrigger className="mt-1 border-border bg-secondary text-foreground">
              <SelectValue placeholder="Choose a test..." />
            </SelectTrigger>
            <SelectContent className="max-h-80 border-border bg-card">
              {FAMILY_ORDER.filter(f => visibleByFamily[f]?.length).map(family => (
                <div key={family}>
                  <div className="px-2 py-1 text-xs font-bold uppercase text-primary/80">
                    {FAMILY_LABELS[family]}
                  </div>
                  {visibleByFamily[family]!.map((t: any) => (
                    <SelectItem key={t.id} value={t.id} className="text-foreground">
                      {t.name} ({t.unit}){t.is_custom && <span className="ml-1 text-xs text-primary">★</span>}
                    </SelectItem>
                  ))}
                </div>
              ))}
              {visibleTests.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">No tests available</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-muted-foreground">Session Date</Label>
          <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
            className="mt-1 border-border bg-secondary text-foreground" />
        </div>
      </div>

      {selectedTest && rows.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5 text-primary" /> {selectedTest.name}
            <button onClick={() => setShowTestInfo(true)}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 text-primary/60 transition-colors hover:bg-primary hover:text-primary-foreground">
              <Info className="h-3 w-3" />
            </button>
            — Team Table
          </h3>

          <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-primary">Wellness scale (1–6):</span> 1 = Very Poor · 2 = Poor · 3 = Below Average · 4 = Average · 5 = Good · 6 = Excellent
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Present</TableHead>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Result ({selectedTest.unit})</TableHead>
                  {isStrength && <TableHead>Reps</TableHead>}
                  <TableHead>Sleep (1-6)</TableHead>
                  <TableHead>Soreness (1-6)</TableHead>
                  <TableHead>Fatigue (1-6)</TableHead>
                  <TableHead>Period Pain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.profileId} className={!row.present ? "opacity-40" : ""}>
                    <TableCell>
                      <Switch
                        checked={row.present}
                        onCheckedChange={v => updateRow(i, "present", v)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.value}
                        onChange={e => updateRow(i, "value", e.target.value)}
                        disabled={!row.present}
                        className="w-24 border-border bg-secondary text-foreground"
                      />
                    </TableCell>
                    {isStrength && (
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={row.reps}
                          onChange={e => updateRow(i, "reps", e.target.value)}
                          disabled={!row.present}
                          className="w-20 border-border bg-secondary text-foreground"
                          placeholder="1"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="6"
                        value={row.sleep}
                        onChange={e => updateRow(i, "sleep", Number(e.target.value))}
                        disabled={!row.present}
                        className="w-16 border-border bg-secondary text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="6"
                        value={row.soreness}
                        onChange={e => updateRow(i, "soreness", Number(e.target.value))}
                        disabled={!row.present}
                        className="w-16 border-border bg-secondary text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="6"
                        value={row.fatigue}
                        onChange={e => updateRow(i, "fatigue", Number(e.target.value))}
                        disabled={!row.present}
                        className="w-16 border-border bg-secondary text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      {row.sex === "female" ? (
                        <Input
                          type="number"
                          min="1"
                          max="6"
                          value={row.periodPain}
                          onChange={e => updateRow(i, "periodPain", Number(e.target.value))}
                          disabled={!row.present}
                          className="w-16 border-border bg-secondary text-foreground"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rows.filter(r => r.present && r.value).length} / {rows.length} athletes with data
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!selectedTest) return;
                  exportTeamSessionReport({
                    teamName: focus.teamName || "Team",
                    testName: selectedTest.name,
                    testUnit: selectedTest.unit,
                    sessionDate,
                    athletes: rows.map(r => ({
                      name: r.name,
                      value: r.present && r.value ? Number(r.value) : null,
                      present: r.present && !!r.value,
                    })),
                  });
                }}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
                disabled={!rows.some(r => r.present && r.value)}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export Session
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                className="gradient-orange glow-orange text-primary-foreground"
                disabled={saveMutation.isPending || !rows.some(r => r.present && r.value)}
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save Session"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
      {selectedTest && (
        <TestInfoModal
          test={{ name: selectedTest.name, family: selectedTest.family, unit: selectedTest.unit, description: selectedTest.description }}
          open={showTestInfo}
          onOpenChange={setShowTestInfo}
        />
      )}
      <CreateCustomTestDialog open={showCreateTest} onOpenChange={setShowCreateTest} />
    </div>
  );
}
