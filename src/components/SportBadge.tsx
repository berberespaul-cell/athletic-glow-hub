import { useSportTheme } from "@/contexts/SportThemeContext";

const SPORT_ICONS: Record<string, string> = {
  basketball: "🏀",
  volleyball: "🏐",
  rugby: "🏉",
  hybrid: "⚡",
};

export function SportBadge({ className = "" }: { className?: string }) {
  const { theme, sport } = useSportTheme();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary ${className}`}
    >
      <span>{SPORT_ICONS[sport]}</span>
      {theme.badge}
    </span>
  );
}

export function SportIcon({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { sport } = useSportTheme();
  const sizeClasses = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

  return <span className={sizeClasses[size]}>{SPORT_ICONS[sport]}</span>;
}

export function SportWatermark() {
  const { sport } = useSportTheme();

  const patterns: Record<string, JSX.Element> = {
    basketball: (
      <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="0.5">
        <circle cx="100" cy="100" r="90" />
        <path d="M10 100 Q100 60 190 100" />
        <path d="M10 100 Q100 140 190 100" />
        <line x1="100" y1="10" x2="100" y2="190" />
      </svg>
    ),
    volleyball: (
      <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="0.5">
        <circle cx="100" cy="100" r="90" />
        <path d="M100 10 Q60 100 100 190" />
        <path d="M100 10 Q140 100 100 190" />
        <path d="M15 55 Q100 80 185 55" />
        <path d="M15 145 Q100 120 185 145" />
      </svg>
    ),
    rugby: (
      <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="0.5">
        <ellipse cx="100" cy="100" rx="80" ry="50" />
        <line x1="30" y1="100" x2="170" y2="100" />
        <path d="M60 55 Q100 45 140 55" />
        <path d="M60 145 Q100 155 140 145" />
      </svg>
    ),
    hybrid: (
      <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="0.5">
        <polygon points="100,15 185,65 185,135 100,185 15,135 15,65" />
        <polygon points="100,45 155,75 155,125 100,155 45,125 45,75" />
      </svg>
    ),
  };

  return (
    <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 text-primary/[0.04]">
      {patterns[sport]}
    </div>
  );
}
