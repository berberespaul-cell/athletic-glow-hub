import { createContext, useContext, useState, ReactNode } from "react";

export type FocusMode = "athlete" | "team" | null;

interface FocusTarget {
  mode: FocusMode;
  athleteProfileId: string | null;
  athleteName: string | null;
  teamId: string | null;
  teamName: string | null;
}

interface CoachFocusContextType {
  focus: FocusTarget;
  setAthleteFocus: (profileId: string, name: string) => void;
  setTeamFocus: (teamId: string, name: string) => void;
  clearFocus: () => void;
}

const CoachFocusContext = createContext<CoachFocusContextType>({
  focus: { mode: null, athleteProfileId: null, athleteName: null, teamId: null, teamName: null },
  setAthleteFocus: () => {},
  setTeamFocus: () => {},
  clearFocus: () => {},
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

  const setAthleteFocus = (profileId: string, name: string) =>
    setFocus({ mode: "athlete", athleteProfileId: profileId, athleteName: name, teamId: null, teamName: null });

  const setTeamFocus = (teamId: string, name: string) =>
    setFocus({ mode: "team", athleteProfileId: null, athleteName: null, teamId, teamName: name });

  const clearFocus = () =>
    setFocus({ mode: null, athleteProfileId: null, athleteName: null, teamId: null, teamName: null });

  return (
    <CoachFocusContext.Provider value={{ focus, setAthleteFocus, setTeamFocus, clearFocus }}>
      {children}
    </CoachFocusContext.Provider>
  );
}
