import { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type SportType = "rugby" | "basketball" | "volleyball" | "hybrid";

interface SportThemeConfig {
  sport: SportType;
  label: string;
  badge: string;
  accent: string; // HSL values for CSS variable override
  accentGlow: string;
}

const ORANGE_ACCENT = "14 100% 60%";  // Unified orange for all sports
const ORANGE_GLOW = "14 80% 50%";

const SPORT_THEMES: Record<SportType, SportThemeConfig> = {
  basketball: {
    sport: "basketball",
    label: "Basketball",
    badge: "Basketball Performance",
    accent: ORANGE_ACCENT,
    accentGlow: ORANGE_GLOW,
  },
  volleyball: {
    sport: "volleyball",
    label: "Volleyball",
    badge: "Volleyball Performance",
    accent: ORANGE_ACCENT,
    accentGlow: ORANGE_GLOW,
  },
  rugby: {
    sport: "rugby",
    label: "Rugby",
    badge: "Rugby Performance",
    accent: ORANGE_ACCENT,
    accentGlow: ORANGE_GLOW,
  },
  hybrid: {
    sport: "hybrid",
    label: "Hybrid",
    badge: "Hybrid Performance",
    accent: ORANGE_ACCENT,
    accentGlow: ORANGE_GLOW,
  },
};

interface SportThemeContextType {
  theme: SportThemeConfig;
  sport: SportType;
}

const SportThemeContext = createContext<SportThemeContextType>({
  theme: SPORT_THEMES.hybrid,
  sport: "hybrid",
});

export const useSportTheme = () => useContext(SportThemeContext);
export { SPORT_THEMES };

export function SportThemeProvider({ children }: { children: ReactNode }) {
  const { profileId } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-sport", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data } = await supabase.from("profiles").select("sport").eq("id", profileId).single();
      return data;
    },
    enabled: !!profileId,
  });

  const sport = (profile?.sport || "hybrid") as SportType;
  const theme = SPORT_THEMES[sport];

  // Apply CSS variable overrides to :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.accent);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--ring", theme.accent);
    root.style.setProperty("--sidebar-primary", theme.accent);
    root.style.setProperty("--sidebar-ring", theme.accent);
    root.style.setProperty("--chart-1", theme.accent);
    root.style.setProperty("--chart-2", theme.accentGlow);
    root.style.setProperty("--sport-accent", theme.accent);
    root.style.setProperty("--sport-accent-glow", theme.accentGlow);

    return () => {
      // Reset to defaults on unmount
      root.style.removeProperty("--primary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-ring");
      root.style.removeProperty("--chart-1");
      root.style.removeProperty("--chart-2");
      root.style.removeProperty("--sport-accent");
      root.style.removeProperty("--sport-accent-glow");
    };
  }, [theme]);

  return (
    <SportThemeContext.Provider value={{ theme, sport }}>
      {children}
    </SportThemeContext.Provider>
  );
}
