import { createContext, useContext, useState, useRef, ReactNode } from "react";

export type FocusMode = "athlete" | "team" | null;

interface FocusTarget {
  mode: FocusMode;
  athleteProfileId: string | null;
  athleteName: string | null;
  teamId: string | null;
  teamName: string | null;
}

interface PreviousTeam {
  teamId: string;
  teamName: string;
}

interface CoachFocusContextType {
  focus: FocusTarget;
  previousTeam: PreviousTeam | null;
  setAthleteFocus: (profileId: string, name: string) => void;
  setTeamFocus: (teamId: string, name: string) => void;
  clearFocus: () => void;
  backToTeam: () => void;
}

const CoachFocusContext = createContext<CoachFocusContextType>({
  focus: { mode: null, athleteProfileId: null, athleteName: null, teamId: null, teamName: null },
  previousTeam: null,
  setAthleteFocus: () => {},
  setTeamFocus: () => {},
  clearFocus: () => {},
  backToTeam: () => {},
});

export const useCoachFocus = () => useContext(CoachFocusContext);

export function CoachFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<FocusTarget>({
    mode: null,
    athleteProfileId: null,
    athleteName: null,
    teamId: null,
    teamName: null,
  });
  const [previousTeam, setPreviousTeam] = useState<PreviousTeam | null>(null);

  const setAthleteFocus = (profileId: string, name: string) => {
    // Remember current team if switching from team to athlete
    if (focus.mode === "team" && focus.teamId && focus.teamName) {
      setPreviousTeam({ teamId: focus.teamId, teamName: focus.teamName });
    }
    setFocus({ mode: "athlete", athleteProfileId: profileId, athleteName: name, teamId: null, teamName: null });
  };

  const setTeamFocus = (teamId: string, name: string) => {
    setPreviousTeam(null);
    setFocus({ mode: "team", athleteProfileId: null, athleteName: null, teamId, teamName: name });
  };

  const clearFocus = () => {
    setPreviousTeam(null);
    setFocus({ mode: null, athleteProfileId: null, athleteName: null, teamId: null, teamName: null });
  };

  const backToTeam = () => {
    if (previousTeam) {
      setFocus({ mode: "team", athleteProfileId: null, athleteName: null, teamId: previousTeam.teamId, teamName: previousTeam.teamName });
      setPreviousTeam(null);
    }
  };

  return (
    <CoachFocusContext.Provider value={{ focus, previousTeam, setAthleteFocus, setTeamFocus, clearFocus, backToTeam }}>
      {children}
    </CoachFocusContext.Provider>
  );
}
