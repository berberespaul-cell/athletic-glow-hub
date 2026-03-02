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
import { getTestsForSport, type SportType } from "@/lib/sportTests";
import { Save, User } from "lucide-react";

const SPORTS: SportType[] = ["rugby", "basketball", "volleyball", "hybrid"];

export default function ProfilePage() {
  const { profileId, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportType>("hybrid");
  const [position, setPosition] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSport(profile.sport as SportType);
      setPosition(profile.position || "");
      setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
      setHeight(profile.height_cm ? String(profile.height_cm) : "");
      setBirthDate(profile.birth_date || "");
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          sport,
          position: position || null,
          weight_kg: weight ? Number(weight) : null,
          height_cm: height ? Number(height) : null,
          birth_date: birthDate || null,
        })
        .eq("id", profileId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testBattery = getTestsForSport(sport);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your athlete profile and sport selection</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card col-span-2 space-y-5 rounded-2xl p-6"
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <User className="h-5 w-5 text-primary" /> Personal Information
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border-border bg-secondary text-foreground" />
            </div>
            <div>
              <Label className="text-muted-foreground">Sport</Label>
              <Select value={sport} onValueChange={(v) => setSport(v as SportType)}>
                <SelectTrigger className="mt-1 border-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {SPORTS.map(s => (
                    <SelectItem key={s} value={s} className="capitalize text-foreground">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <Button onClick={() => mutation.mutate()} className="gradient-orange text-primary-foreground" disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>

        {/* Test Battery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Test Battery <span className="text-sm capitalize text-primary">({sport})</span>
          </h3>
          <div className="space-y-2">
            {testBattery.map(test => (
              <div key={test.name} className="rounded-lg bg-secondary/50 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{test.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{test.family.replace(/_/g, " ")} • {test.unit}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {testBattery.length} tests in your battery. Change sport to update.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
