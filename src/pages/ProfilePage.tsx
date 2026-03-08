import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getTestsForSport, getRecommendedTestNames, FAMILY_LABELS, FAMILY_ORDER, type SportType, type TestFamily } from "@/lib/sportTests";
import { Save, User, Weight, Plus, Link2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { SportBadge } from "@/components/SportBadge";

const SPORTS: SportType[] = ["rugby", "basketball", "volleyball", "hybrid"];

export default function ProfilePage() {
  const { profileId, role } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: weightLogs } = useQuery({
    queryKey: ["weight-logs", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("profile_id", profileId!)
        .order("logged_at", { ascending: true });
      return data || [];
    },
    enabled: !!profileId,
  });

  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportType>("hybrid");
  const [position, setPosition] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [claimCode, setClaimCode] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSport(profile.sport as SportType);
      setPosition(profile.position || "");
      setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
      setHeight(profile.height_cm ? String(profile.height_cm) : "");
      setBirthDate(profile.birth_date || "");
      setSex((profile as any).sex || "");
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          name, sport,
          position: position || null,
          weight_kg: weight ? Number(weight) : null,
          height_cm: height ? Number(height) : null,
          birth_date: birthDate || null,
          sex: sex || null,
        } as any)
        .eq("id", profileId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const weightLogMutation = useMutation({
    mutationFn: async () => {
      const w = Number(newWeight);
      if (!w || w <= 0) throw new Error("Invalid weight");
      const { error: logErr } = await supabase.from("weight_logs").insert({ profile_id: profileId!, weight_kg: w });
      if (logErr) throw logErr;
      const { error: profErr } = await supabase.from("profiles").update({ weight_kg: w }).eq("id", profileId!);
      if (profErr) throw profErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setNewWeight("");
      setWeight(newWeight);
      toast({ title: "Weight logged!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const code = claimCode.trim().toUpperCase();
      if (!code) throw new Error("Please enter a code");

      const { data: targetProfile, error: findErr } = await supabase
        .from("profiles")
        .select("id, name, coach_created_by")
        .eq("invite_code", code)
        .maybeSingle();

      if (findErr || !targetProfile) throw new Error("Invalid code. No matching profile found.");

      // Get current user id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update the target profile with current user's id
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ user_id: user.id, invite_code: null } as any)
        .eq("id", targetProfile.id);
      if (updateErr) throw updateErr;

      // Delete the current auto-created profile
      if (profileId && profileId !== targetProfile.id) {
        await supabase.from("profiles").delete().eq("id", profileId);
      }

      // Link coach
      if (targetProfile.coach_created_by) {
        await supabase.from("coach_athletes").insert({
          coach_id: targetProfile.coach_created_by,
          athlete_id: user.id,
        } as any);
      }

      return targetProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setClaimCode("");
      toast({ title: "Profile claimed!", description: `You're now linked as ${data.name}.` });
      // Reload to pick up new profile
      window.location.reload();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const testBattery = getTestsForSport(sport);
  const recommendedNames = getRecommendedTestNames(sport);

  const batteryByFamily: Partial<Record<TestFamily, typeof testBattery>> = {};
  testBattery.forEach(t => {
    if (!batteryByFamily[t.family]) batteryByFamily[t.family] = [];
    batteryByFamily[t.family]!.push(t);
  });

  const weightChartData = weightLogs?.map(l => ({
    date: l.logged_at,
    weight: Number(l.weight_kg),
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isCoach = role === "coach";

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
          <SportBadge />
        </div>
        <p className="mt-1 text-muted-foreground">
          {isCoach ? "Manage your coach profile" : "Manage your athlete profile and sport selection"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card col-span-2 space-y-5 rounded-2xl p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <User className="h-5 w-5 text-primary" /> Personal Information
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border-border bg-secondary text-foreground" />
            </div>
            {!isCoach && (
              <div>
                <Label className="text-muted-foreground">Sport</Label>
                <Select value={sport} onValueChange={(v) => setSport(v as SportType)}>
                  <SelectTrigger className="mt-1 border-border bg-secondary text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {SPORTS.map(s => <SelectItem key={s} value={s} className="capitalize text-foreground">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Sex</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger className="mt-1 border-border bg-secondary text-foreground"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="male" className="text-foreground">Male</SelectItem>
                  <SelectItem value="female" className="text-foreground">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isCoach && (
              <>
                <div>
                  <Label className="text-muted-foreground">Position</Label>
                  <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Point Guard" className="mt-1 border-border bg-secondary text-foreground" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Birth Date</Label>
                  <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 border-border bg-secondary text-foreground" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Weight (kg)</Label>
                  <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75.0" className="mt-1 border-border bg-secondary text-foreground" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Height (cm)</Label>
                  <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="180.0" className="mt-1 border-border bg-secondary text-foreground" />
                </div>
              </>
            )}
          </div>

          <Button onClick={() => mutation.mutate()} className="gradient-orange text-primary-foreground" disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>

        {/* Right panel: Test Battery (athletes) or Claim Code */}
        {!isCoach && (
          <div className="space-y-6">
            {/* Athlete Code Claim */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass-card rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Link2 className="h-5 w-5 text-primary" /> Link to Coach
              </h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Enter the code your coach gave you to link your profile.
              </p>
              <div className="flex gap-2">
                <Input value={claimCode} onChange={e => setClaimCode(e.target.value)}
                  placeholder="e.g. A1B2C3D4" className="border-border bg-secondary font-mono text-foreground uppercase" />
                <Button onClick={() => claimMutation.mutate()} className="gradient-orange text-primary-foreground"
                  disabled={!claimCode.trim() || claimMutation.isPending}>
                  {claimMutation.isPending ? "..." : "Claim"}
                </Button>
              </div>
            </motion.div>

            {/* Test Battery */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Test Battery <span className="text-sm capitalize text-primary">({sport})</span>
              </h3>
              <div className="space-y-3">
                {FAMILY_ORDER.filter(f => batteryByFamily[f]?.length).map(family => (
                  <div key={family}>
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">{FAMILY_LABELS[family]}</p>
                    <div className="space-y-1">
                      {batteryByFamily[family]!.map(test => (
                        <div key={test.name} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                          {recommendedNames.includes(test.name) && <span className="text-xs text-primary">★</span>}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{test.name}</p>
                            <p className="text-xs text-muted-foreground">{test.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{testBattery.length} tests available • ★ = recommended</p>
            </motion.div>
          </div>
        )}

        {isCoach && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Coach Mode</h3>
            <p className="text-sm text-muted-foreground">
              As a coach, manage your teams and athletes from the <span className="font-medium text-primary">Teams</span> page.
              Use the <span className="font-medium text-primary">Team Test Entry</span> to log bulk results.
            </p>
          </motion.div>
        )}
      </div>

      {/* Weight Evolution - only for athletes */}
      {!isCoach && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Weight className="h-5 w-5 text-primary" /> Weight Evolution
          </h3>
          <div className="mb-4 flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <Label className="text-muted-foreground">Log today's weight (kg)</Label>
              <Input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                placeholder={weight || "75.0"} className="mt-1 border-border bg-secondary text-foreground" />
            </div>
            <Button onClick={() => weightLogMutation.mutate()} disabled={!newWeight || weightLogMutation.isPending}
              className="gradient-orange text-primary-foreground">
              <Plus className="mr-1 h-4 w-4" /> Log
            </Button>
          </div>
          {weightChartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightChartData}>
                <XAxis dataKey="date" stroke="hsl(0 0% 64%)" fontSize={11} />
                <YAxis stroke="hsl(0 0% 64%)" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)", borderRadius: "12px", color: "hsl(0 0% 95%)" }} />
                <Line type="monotone" dataKey="weight" stroke="hsl(14 100% 60%)" strokeWidth={2} dot={{ fill: "hsl(14 100% 60%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {weightChartData.length === 1 ? "Log more weights to see your trend." : "No weight logs yet. Start logging above!"}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
