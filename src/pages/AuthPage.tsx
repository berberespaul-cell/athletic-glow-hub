import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Activity, Zap } from "lucide-react";

type AppRole = "athlete" | "coach";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("athlete");
  const [sex, setSex] = useState<string>("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        // Validate sex for athletes
        if (selectedRole === "athlete" && !sex) {
          throw new Error("Please select your gender (Male/Female)");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user) {
          // Assign role
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: selectedRole });
          // Update profile name and sex
          const updateData: Record<string, any> = { name };
          if (sex) updateData.sex = sex;
          await supabase.from("profiles").update(updateData).eq("user_id", data.user.id);

          // If athlete provided an invite code, claim the profile
          if (selectedRole === "athlete" && inviteCode.trim()) {
            await claimInviteCode(data.user.id, inviteCode.trim().toUpperCase());
          }
        }
        toast({ title: "Account created!", description: "You can now sign in." });
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  async function claimInviteCode(userId: string, code: string) {
    try {
      // Find the profile with this invite code
      const { data: targetProfile, error: findErr } = await supabase
        .from("profiles")
        .select("id, name, sport, sex, position, height_cm, weight_kg, birth_date, coach_created_by")
        .eq("invite_code", code)
        .maybeSingle();

      if (findErr || !targetProfile) {
        toast({ title: "Invalid Code", description: "No profile found with that invite code.", variant: "destructive" });
        return;
      }

      // Update the coach-created profile with the new user's id and clear invite code
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          user_id: userId,
          invite_code: null,
        } as any)
        .eq("id", targetProfile.id);

      if (updateErr) throw updateErr;

      // Delete the auto-created profile for this user (the one created by trigger)
      // First find it
      const { data: autoProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .neq("id", targetProfile.id)
        .maybeSingle();

      if (autoProfile) {
        await supabase.from("profiles").delete().eq("id", autoProfile.id);
      }

      // Update the coach_athletes link if needed
      if (targetProfile.coach_created_by) {
        await supabase.from("coach_athletes").insert({
          coach_id: targetProfile.coach_created_by,
          athlete_id: userId,
        } as any);
      }

      toast({ title: "Profile claimed!", description: `You've been linked to your coach's team as ${targetProfile.name}.` });
    } catch (err: any) {
      console.error("Claim error:", err);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-md rounded-2xl p-8"
      >
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="gradient-orange flex h-12 w-12 items-center justify-center rounded-xl">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">PerformLab</h1>
        </div>

        <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <Label htmlFor="name" className="text-muted-foreground">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required={!isLogin}
                  className="mt-1 border-border bg-secondary text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <Label className="text-muted-foreground">I am a...</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["athlete", "coach"] as AppRole[]).map((r) => (
                    <button key={r} type="button" onClick={() => setSelectedRole(r)}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                        selectedRole === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                      }`}>
                      {r === "athlete" ? <Zap className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {selectedRole === "athlete" && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Gender *</Label>
                    <Select value={sex} onValueChange={setSex}>
                      <SelectTrigger className="mt-1 border-border bg-secondary text-foreground">
                        <SelectValue placeholder="Select gender..." />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card">
                        <SelectItem value="male" className="text-foreground">Male</SelectItem>
                        <SelectItem value="female" className="text-foreground">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Athlete Code (optional)</Label>
                    <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter code from your coach"
                      className="mt-1 border-border bg-secondary text-foreground placeholder:text-muted-foreground" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      If your coach gave you a code, enter it to link your profile. You can also do this later.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="mt-1 border-border bg-secondary text-foreground placeholder:text-muted-foreground" />
          </div>
          <div>
            <Label htmlFor="password" className="text-muted-foreground">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              className="mt-1 border-border bg-secondary text-foreground placeholder:text-muted-foreground" />
          </div>

          <Button type="submit" className="gradient-orange w-full text-primary-foreground glow-orange" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
