import { useCoachFocus } from "@/contexts/CoachFocusContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, User, X } from "lucide-react";

export default function CoachFocusSelector() {
  const { user } = useAuth();
  const { focus, setAthleteFocus, setTeamFocus, clearFocus } = useCoachFocus();

  const { data: teams } = useQuery({
    queryKey: ["coach-teams", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("id, name, sport")
        .eq("coach_id", user!.id)
        .order("name");
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: athletes } = useQuery({
    queryKey: ["coach-athletes-all", user?.id],
    queryFn: async () => {
      // Get all profiles created by this coach
      const { data } = await supabase
        .from("profiles")
        .select("id, name, sport, invite_code")
        .eq("coach_created_by", user!.id)
        .order("name");
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleChange = (val: string) => {
    if (val === "__clear__") {
      clearFocus();
      return;
    }
    if (val.startsWith("team:")) {
      const teamId = val.replace("team:", "");
      const team = teams?.find(t => t.id === teamId);
      if (team) setTeamFocus(teamId, team.name);
    } else if (val.startsWith("athlete:")) {
      const profileId = val.replace("athlete:", "");
      const athlete = athletes?.find(a => a.id === profileId);
      if (athlete) setAthleteFocus(profileId, athlete.name);
    }
  };

  const currentValue = focus.mode === "team" && focus.teamId
    ? `team:${focus.teamId}`
    : focus.mode === "athlete" && focus.athleteProfileId
    ? `athlete:${focus.athleteProfileId}`
    : "";

  return (
    <div className="mb-6 flex items-center gap-3">
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="w-72 border-border bg-secondary text-foreground">
          <SelectValue placeholder="Select focus: athlete or team..." />
        </SelectTrigger>
        <SelectContent className="border-border bg-card">
          {focus.mode && (
            <SelectItem value="__clear__" className="text-muted-foreground">
              <span className="flex items-center gap-2">
                <X className="h-3 w-3" /> Clear Focus
              </span>
            </SelectItem>
          )}
          {(teams?.length ?? 0) > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-bold uppercase text-primary">
                <Users className="mr-1 inline h-3 w-3" /> Teams
              </div>
              {teams!.map(t => (
                <SelectItem key={t.id} value={`team:${t.id}`} className="text-foreground">
                  {t.name}
                </SelectItem>
              ))}
            </>
          )}
          {(athletes?.length ?? 0) > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-bold uppercase text-primary">
                <User className="mr-1 inline h-3 w-3" /> Athletes
              </div>
              {athletes!.map(a => (
                <SelectItem key={a.id} value={`athlete:${a.id}`} className="text-foreground">
                  {a.name}
                </SelectItem>
              ))}
            </>
          )}
          {(!teams?.length && !athletes?.length) && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No teams or athletes yet. Create a team first.
            </div>
          )}
        </SelectContent>
      </Select>
      {focus.mode && (
        <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
          {focus.mode === "team" ? `Team: ${focus.teamName}` : `Athlete: ${focus.athleteName}`}
        </div>
      )}
    </div>
  );
}
