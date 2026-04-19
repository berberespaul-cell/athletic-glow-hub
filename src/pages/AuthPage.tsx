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

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">Or continue with</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full border-border bg-secondary text-foreground hover:bg-secondary/80"
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
              if (result.error) toast({ title: "Sign-in failed", description: (result.error as Error).message, variant: "destructive" });
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-border bg-secondary text-foreground hover:bg-secondary/80"
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
              if (result.error) toast({ title: "Sign-in failed", description: (result.error as Error).message, variant: "destructive" });
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </Button>
        </div>

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
