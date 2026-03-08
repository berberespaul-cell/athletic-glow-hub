import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, Users, Trash2, Copy, UserPlus, ClipboardList } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SportType } from "@/lib/sportTests";

const SPORTS: SportType[] = ["rugby", "basketball", "volleyball", "hybrid"];

export default function TeamManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamSport, setTeamSport] = useState<SportType>("hybrid");
  const [teamLevel, setTeamLevel] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Add athlete form
  const [athleteFirst, setAthleteFirst] = useState("");
  const [athleteLast, setAthleteLast] = useState("");
  const [athleteAge, setAthleteAge] = useState("");
  const [athletePosition, setAthletePosition] = useState("");
  const [athleteHeight, setAthleteHeight] = useState("");
  const [athleteWeight, setAthleteWeight] = useState("");
  const [athleteSex, setAthleteSex] = useState<string>("male");
  const [showAddAthlete, setShowAddAthlete] = useState(false);

  const { data: teams } = useQuery({
    queryKey: ["coach-teams", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data } = await supabase
        .from("team_members")
        .select("*, profiles(id, name, sex, position, height_cm, weight_kg, invite_code, birth_date)")
        .eq("team_id", selectedTeamId);
      return data || [];
    },
    enabled: !!selectedTeamId,
  });

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teams").insert({
        coach_id: user!.id,
        name: teamName,
        sport: teamSport,
        level: teamLevel || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-teams"] });
      setTeamName("");
      setTeamLevel("");
      setShowCreateTeam(false);
      toast({ title: "Team created!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-teams"] });
      if (selectedTeamId) setSelectedTeamId(null);
      toast({ title: "Team deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addAthleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeamId || !athleteFirst) throw new Error("Missing data");
      const team = teams?.find(t => t.id === selectedTeamId);
      const fullName = `${athleteFirst} ${athleteLast}`.trim();

      // Generate invite code
      const { data: codeData } = await supabase.rpc("generate_invite_code");
      const inviteCode = codeData as string;

      // Create a profile for this athlete (coach-managed)
      // Use a random UUID as user_id since athlete hasn't claimed yet
      const randomUserId = crypto.randomUUID();
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: randomUserId,
          name: fullName,
          sport: team?.sport || "hybrid",
          sex: athleteSex || null,
          position: athletePosition || null,
          height_cm: athleteHeight ? Number(athleteHeight) : null,
          weight_kg: athleteWeight ? Number(athleteWeight) : null,
          birth_date: athleteAge ? calculateBirthDate(Number(athleteAge)) : null,
          invite_code: inviteCode,
          coach_created_by: user!.id,
        } as any)
        .select("id")
        .single();

      if (profileError) throw profileError;

      // Link profile to team
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: selectedTeamId,
        profile_id: profileData.id,
      } as any);
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["coach-athletes-all"] });
      resetAthleteForm();
      setShowAddAthlete(false);
      toast({ title: "Athlete added to roster!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeAthleteFromTeam = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({ title: "Athlete removed from team" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function calculateBirthDate(age: number): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - age);
    return d.toISOString().split("T")[0];
  }

  function resetAthleteForm() {
    setAthleteFirst("");
    setAthleteLast("");
    setAthleteAge("");
    setAthletePosition("");
    setAthleteHeight("");
    setAthleteWeight("");
    setAthleteSex("male");
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied!", description: code });
  }

  const activeTeam = teams?.find(t => t.id === selectedTeamId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="mt-1 text-muted-foreground">Create teams and manage athlete rosters</p>
        </div>
        <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
          <DialogTrigger asChild>
            <Button className="gradient-orange text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Team Name</Label>
                <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. U18 Elite"
                  className="mt-1 border-border bg-secondary text-foreground" />
              </div>
              <div>
                <Label className="text-muted-foreground">Sport</Label>
                <Select value={teamSport} onValueChange={v => setTeamSport(v as SportType)}>
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
                <Label className="text-muted-foreground">Level (optional)</Label>
                <Input value={teamLevel} onChange={e => setTeamLevel(e.target.value)} placeholder="e.g. Senior, U18"
                  className="mt-1 border-border bg-secondary text-foreground" />
              </div>
              <Button onClick={() => createTeamMutation.mutate()} className="gradient-orange w-full text-primary-foreground"
                disabled={!teamName || createTeamMutation.isPending}>
                {createTeamMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map(team => (
          <motion.button
            key={team.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedTeamId(team.id)}
            className={`glass-card rounded-2xl p-5 text-left transition-all ${
              selectedTeamId === team.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{team.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {team.sport}{team.level ? ` • ${team.level}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteTeamMutation.mutate(team.id); }}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.button>
        ))}
        {(!teams || teams.length === 0) && (
          <div className="glass-card col-span-full rounded-2xl p-8 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No teams yet. Create your first team!</p>
          </div>
        )}
      </div>

      {/* Roster for selected team */}
      {activeTeam && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{activeTeam.name} — Roster</h2>
              <p className="text-sm capitalize text-muted-foreground">{activeTeam.sport}{activeTeam.level ? ` • ${activeTeam.level}` : ""}</p>
            </div>
            <Dialog open={showAddAthlete} onOpenChange={setShowAddAthlete}>
              <DialogTrigger asChild>
                <Button className="gradient-orange text-primary-foreground" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" /> Add Athlete
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-card">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add Athlete to {activeTeam.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-muted-foreground">First Name *</Label>
                      <Input value={athleteFirst} onChange={e => setAthleteFirst(e.target.value)}
                        className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Name</Label>
                      <Input value={athleteLast} onChange={e => setAthleteLast(e.target.value)}
                        className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-muted-foreground">Sex *</Label>
                      <Select value={athleteSex} onValueChange={setAthleteSex}>
                        <SelectTrigger className="mt-1 border-border bg-secondary text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                          <SelectItem value="male" className="text-foreground">Male</SelectItem>
                          <SelectItem value="female" className="text-foreground">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Age</Label>
                      <Input type="number" value={athleteAge} onChange={e => setAthleteAge(e.target.value)}
                        placeholder="18" className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-muted-foreground">Position</Label>
                      <Input value={athletePosition} onChange={e => setAthletePosition(e.target.value)}
                        placeholder="PG" className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Height (cm)</Label>
                      <Input type="number" value={athleteHeight} onChange={e => setAthleteHeight(e.target.value)}
                        placeholder="180" className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Weight (kg)</Label>
                      <Input type="number" value={athleteWeight} onChange={e => setAthleteWeight(e.target.value)}
                        placeholder="75" className="mt-1 border-border bg-secondary text-foreground" />
                    </div>
                  </div>
                  <Button onClick={() => addAthleteMutation.mutate()} className="gradient-orange w-full text-primary-foreground"
                    disabled={!athleteFirst || addAthleteMutation.isPending}>
                    {addAthleteMutation.isPending ? "Adding..." : "Add Athlete"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {teamMembers && teamMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Height</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member: any) => {
                    const p = member.profiles;
                    const isClaimed = !p?.invite_code;
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium text-foreground">{p?.name || "—"}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{p?.sex || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{p?.position || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{p?.height_cm ? `${p.height_cm} cm` : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{p?.weight_kg ? `${p.weight_kg} kg` : "—"}</TableCell>
                        <TableCell>
                          {p?.invite_code ? (
                            <button
                              onClick={() => copyCode(p.invite_code)}
                              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
                            >
                              {p.invite_code} <Copy className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isClaimed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          }`}>
                            {isClaimed ? "Claimed" : "Pending"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => removeAthleteFromTeam.mutate(member.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">No athletes in this team yet. Add your first athlete!</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
