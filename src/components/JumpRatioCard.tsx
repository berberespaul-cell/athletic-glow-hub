import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, TrendingUp, AlertTriangle, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSportTheme } from "@/contexts/SportThemeContext";

type RatioType = "cmj-sj" | "cmj-abalakov";

type Zone = {
  color: "red" | "yellow" | "green" | "green-warn" | "orange";
  label: string;
  warn?: boolean;
};

const ZONE_COLORS: Record<Zone["color"], string> = {
  red: "hsl(0 75% 55%)",
  yellow: "hsl(45 95% 55%)",
  green: "hsl(140 60% 45%)",
  "green-warn": "hsl(140 55% 50%)",
  orange: "hsl(25 95% 55%)",
};

function getCmjSjZone(v: number): Zone {
  if (v < 1.0) return { color: "red", label: "Reactive strength deficit — SSC not utilized" };
  if (v < 1.15) return { color: "yellow", label: "Average — SSC underutilized" };
  if (v < 1.25) return { color: "green", label: "Good elastic capacity" };
  if (v < 1.35)
    return {
      color: "green-warn",
      label: "Optimal SSC — verify concentric strength levels are not a limiting factor",
      warn: true,
    };
  return { color: "orange", label: "High ratio — investigate potential concentric strength deficit", warn: true };
}

function getCmjAbalZone(v: number): Zone {
  if (v < 0.85) return { color: "red", label: "High arm dependency detected" };
  if (v < 0.95) return { color: "yellow", label: "Moderate arm contribution" };
  if (v < 1.05) return { color: "green", label: "Optimal — strong lower body independence" };
  if (v < 1.1)
    return {
      color: "green-warn",
      label: "Good result — verify arm-leg coordination is not masking a timing issue",
      warn: true,
    };
  return {
    color: "orange",
    label: "Unusually high — check jump technique and inter-segmental coordination",
    warn: true,
  };
}

type AxesByZone = Record<Zone["color"], { label: string; axes: string[] }>;

const TRAINING_AXES: Record<RatioType, AxesByZone> = {
  "cmj-sj": {
    red: {
      label: "< 1.00",
      axes: ["Improve SSC efficiency", "Develop reactive strength qualities", "Reinforce eccentric control"],
    },
    yellow: {
      label: "1.00 – 1.15",
      axes: ["Enhance elastic energy utilization", "Expose the athlete to reactive stimuli", "Build neuromuscular responsiveness"],
    },
    green: {
      label: "1.15 – 1.25",
      axes: ["Maintain reactive qualities", "Sustain concentric strength base", "Transfer to sport-specific actions"],
    },
    "green-warn": {
      label: "1.25 – 1.35",
      axes: ["Preserve elastic profile", "Verify concentric force production", "Cross-check with isolated strength tests"],
    },
    orange: {
      label: "> 1.35",
      axes: ["Develop concentric force production", "Re-balance strength qualities", "Investigate maximal strength deficit"],
    },
  },
  "cmj-abalakov": {
    red: {
      label: "< 0.85",
      axes: ["Address arm-leg coordination", "Develop lower body autonomy", "Improve jump mechanics"],
    },
    yellow: {
      label: "0.85 – 0.95",
      axes: ["Refine inter-segmental timing", "Strengthen lower body independence", "Enhance hip extension power"],
    },
    green: {
      label: "0.95 – 1.05",
      axes: ["Maintain coordination quality", "Sustain explosive lower body output", "Reinforce sport-specific jump patterns"],
    },
    "green-warn": {
      label: "1.05 – 1.10",
      axes: ["Verify technical consistency", "Monitor movement quality", "Preserve current coordination profile"],
    },
    orange: {
      label: "> 1.10",
      axes: ["Re-assess test execution", "Investigate inter-segmental coordination", "Verify movement standardization"],
    },
  },
};

const SPORT_NOTES: Record<RatioType, Record<string, string>> = {
  "cmj-sj": {
    basketball: "Critical for rebounding, blocking and quick second jumps.",
    volleyball: "Essential for spike approach and block reactivity.",
    rugby: "Supports breakdown explosiveness and lineout jumping.",
    hybrid: "Key indicator of overall reactive strength quality.",
  },
  "cmj-abalakov": {
    basketball: "Arm swing is integral — high contribution is expected and trainable.",
    volleyball: "Arm action mirrors spike mechanics — coordination is paramount.",
    rugby: "Less arm reliance in game; lower body independence is valued.",
    hybrid: "Reflects overall coordination between upper and lower body chains.",
  },
};

interface Props {
  type: RatioType;
  value: number;
  title: string;
}

export default function JumpRatioCard({ type, value, title }: Props) {
  const { sport } = useSportTheme();
  const [axesOpen, setAxesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const zone = type === "cmj-sj" ? getCmjSjZone(value) : getCmjAbalZone(value);
  const axes = TRAINING_AXES[type];
  const sportNote = SPORT_NOTES[type][sport] || SPORT_NOTES[type].hybrid;

  // Gauge range
  const gaugeMin = type === "cmj-sj" ? 0.8 : 0.7;
  const gaugeMax = type === "cmj-sj" ? 1.5 : 1.2;
  const markerPct = Math.max(0, Math.min(100, ((value - gaugeMin) / (gaugeMax - gaugeMin)) * 100));

  // Gauge gradient stops
  const gradient =
    type === "cmj-sj"
      ? `linear-gradient(to right, ${ZONE_COLORS.red} 0%, ${ZONE_COLORS.red} 25%, ${ZONE_COLORS.yellow} 25%, ${ZONE_COLORS.yellow} 50%, ${ZONE_COLORS.green} 50%, ${ZONE_COLORS.green} 64%, ${ZONE_COLORS["green-warn"]} 64%, ${ZONE_COLORS["green-warn"]} 78%, ${ZONE_COLORS.orange} 78%, ${ZONE_COLORS.orange} 100%)`
      : `linear-gradient(to right, ${ZONE_COLORS.red} 0%, ${ZONE_COLORS.red} 30%, ${ZONE_COLORS.yellow} 30%, ${ZONE_COLORS.yellow} 50%, ${ZONE_COLORS.green} 50%, ${ZONE_COLORS.green} 70%, ${ZONE_COLORS["green-warn"]} 70%, ${ZONE_COLORS["green-warn"]} 80%, ${ZONE_COLORS.orange} 80%, ${ZONE_COLORS.orange} 100%)`;

  const zoneInfo =
    type === "cmj-sj"
      ? [
          { range: "< 1.00", color: "red" as const, text: "Reactive strength deficit — SSC not utilized" },
          { range: "1.00 – 1.15", color: "yellow" as const, text: "Average — SSC underutilized" },
          { range: "1.15 – 1.25", color: "green" as const, text: "Good elastic capacity" },
          { range: "1.25 – 1.35", color: "green-warn" as const, text: "Optimal SSC — verify concentric strength is not limiting", warn: true },
          { range: "> 1.35", color: "orange" as const, text: "High ratio — investigate concentric strength deficit", warn: true },
        ]
      : [
          { range: "< 0.85", color: "red" as const, text: "High arm dependency detected" },
          { range: "0.85 – 0.95", color: "yellow" as const, text: "Moderate arm contribution" },
          { range: "0.95 – 1.05", color: "green" as const, text: "Optimal — strong lower body independence" },
          { range: "1.05 – 1.10", color: "green-warn" as const, text: "Good — verify coordination is not masking a timing issue", warn: true },
          { range: "> 1.10", color: "orange" as const, text: "Unusually high — check technique and inter-segmental coordination", warn: true },
        ];

  const measureText =
    type === "cmj-sj"
      ? "The ratio between Counter Movement Jump and Squat Jump performance. It reflects how efficiently you use the Stretch-Shortening Cycle (SSC) — your body's elastic energy storage and release during the eccentric-to-concentric transition."
      : "The ratio between Counter Movement Jump (no arms) and Abalakov Jump (with arms). It quantifies how much your upper body contributes to vertical jump performance, and reveals lower body independence.";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card relative rounded-2xl p-5"
      >
        {/* ? Info button */}
        <button
          onClick={() => setInfoOpen(true)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Show ratio information"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-medium">{title}</span>
        </div>

        <p className="mt-2 text-4xl font-bold text-foreground">{value.toFixed(2)}</p>

        {/* Horizontal color gauge */}
        <div className="relative mt-4 h-3 rounded-full overflow-hidden" style={{ background: gradient }}>
          <div
            className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-lg ring-2 ring-background"
            style={{ left: `${markerPct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{gaugeMin.toFixed(2)}</span>
          <span>{gaugeMax.toFixed(2)}</span>
        </div>

        {/* Interpretation */}
        <div className="mt-3 flex items-start gap-1.5">
          {zone.warn && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400/80" />}
          <p
            className={`text-sm leading-snug ${
              zone.warn ? "text-muted-foreground" : "text-foreground"
            }`}
            style={{ color: zone.warn ? undefined : ZONE_COLORS[zone.color] }}
          >
            {zone.label}
          </p>
        </div>

        {/* Sport context */}
        <p className="mt-1.5 text-xs italic text-muted-foreground/80">{sportNote}</p>

        {/* Training Axes button */}
        <button
          onClick={() => setAxesOpen(o => !o)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Training Axes
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${axesOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {axesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Current zone · {axes[zone.color].label}
                </p>
                <ul className="mt-2 space-y-1">
                  {axes[zone.color].axes.map(x => (
                    <li key={x} className="text-xs leading-snug text-foreground/90">
                      • {x}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Info Modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-1 text-sm font-semibold text-primary">What it measures</h4>
              <p className="text-sm text-muted-foreground">{measureText}</p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-primary">Zone breakdown</h4>
              <div className="space-y-2">
                {zoneInfo.map(z => (
                  <div key={z.range} className="flex items-start gap-2 rounded-lg bg-secondary/40 p-2">
                    <span
                      className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ background: ZONE_COLORS[z.color] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{z.range}</p>
                      <p className="text-xs text-muted-foreground">
                        {z.warn && "⚠️ "}
                        {z.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs italic text-muted-foreground">
              These values are indicators — always cross-check with other tests before drawing conclusions.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

