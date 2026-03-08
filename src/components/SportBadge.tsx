import { useSportTheme } from "@/contexts/SportThemeContext";

const SPORT_ICONS: Record<string, string> = {
  basketball: "🏀",
  volleyball: "🏐",
  rugby: "🏉",
  hybrid: "⚡",
};

export function SportBadge({ className = "" }: { className?: string }) {
  const { theme } = useSportTheme();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary ${className}`}
    >
      {theme.badge}
    </span>
  );
}

export function SportIcon({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { sport } = useSportTheme();
  const sizeClasses = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

  return <span className={sizeClasses[size]}>{SPORT_ICONS[sport]}</span>;
}
