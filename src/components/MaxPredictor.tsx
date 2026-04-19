import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { brzycki1RM, isLowerBetter } from "@/lib/calculations";

// Theoretical Total ratios (% of Total = 100%)
const LIFT_RATIOS: Record<string, number> = {
  Total: 1.0,
  Snatch: 0.45,
  "Clean & Jerk": 0.55,
  "Power Snatch": 0.37,
  "Power Clean": 0.45,
  "Back Squat": 0.72,
  "Front Squat": 0.60,
  "Strict Press": 0.30,
  Jerk: 0.60,
};

const LIFT_ORDER = [
  "Total",
  "Snatch",
  "Clean & Jerk",
  "Power Snatch",
  "Power Clean",
  "Back Squat",
  "Front Squat",
  "Strict Press",
  "Jerk",
];

// Map lift display names to possible test_library names (loose matching)
const LIFT_NAME_ALIASES: Record<string, string[]> = {
  Snatch: ["snatch"],
  "Clean & Jerk": ["clean & jerk", "clean and jerk", "clean+jerk", "c&j"],
  "Power Snatch": ["power snatch"],
  "Power Clean": ["power clean"],
  "Back Squat": ["back squat"],
  "Front Squat": ["front squat"],
  "Strict Press": ["strict press", "military press", "overhead press"],
  Jerk: ["jerk"],
  Total: ["total"],
};

type ResultRow = {
  value: number;
  reps: number | null;
  test_library: { name: string; family: string } | null;
};

interface MaxPredictorProps {
  results: ResultRow[];
}

function findActual1RM(liftName: string, results: ResultRow[]): number | null {
  const aliases = LIFT_NAME_ALIASES[liftName] || [liftName.toLowerCase()];
  // Find best matching test result (highest 1RM equivalent)
  let best: number | null = null;
  for (const r of results) {
    const tname = r.test_library?.name?.toLowerCase().trim();
    if (!tname) continue;
    // Exact-ish match: alias must match the test name (handle small variants)
    const matches = aliases.some(a => tname === a || tname.includes(a));
    // Avoid "power snatch" matching plain "snatch" (and similar)
    if (liftName === "Snatch" && tname.includes("power")) continue;
    if (liftName === "Clean & Jerk" && tname.includes("power")) continue;
    if (!matches) continue;
    const family = r.test_library?.family || "";
    if (isLowerBetter(family)) continue;
    const oneRM = r.reps && r.reps > 1 ? brzycki1RM(Number(r.value), r.reps) : Number(r.value);
    if (best === null || oneRM > best) best = oneRM;
  }
  return best ? parseFloat(best.toFixed(1)) : null;
}

export default function MaxPredictor({ results }: MaxPredictorProps) {
  const [sourceLift, setSourceLift] = useState<string>("Clean & Jerk");
  const [weight, setWeight] = useState<string>("");

  const weightNum = parseFloat(weight);
  const validInput = !isNaN(weightNum) && weightNum > 0;

  const theoreticalTotal = useMemo(() => {
    if (!validInput) return null;
    const ratio = LIFT_RATIOS[sourceLift];
    if (!ratio) return null;
    return weightNum / ratio;
  }, [sourceLift, weightNum, validInput]);

  const rows = useMemo(() => {
    return LIFT_ORDER.map(lift => {
      const predicted = theoreticalTotal !== null
        ? parseFloat((theoreticalTotal * LIFT_RATIOS[lift]).toFixed(1))
        : null;
      const actual = findActual1RM(lift, results);
      const delta = predicted !== null && actual !== null
        ? parseFloat((((actual - predicted) / predicted) * 100).toFixed(1))
        : null;
      return { lift, ratio: LIFT_RATIOS[lift], predicted, actual, delta, isSource: lift === sourceLift };
    });
  }, [theoreticalTotal, results, sourceLift]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Max Predictor</h2>
        <Badge className="ml-1 border-primary/30 bg-primary/15 text-primary text-[10px]">Weightlifting</Badge>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Enter a 1RM to project your potential across all Olympic lifts based on the Theoretical Total method.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Source Lift</label>
          <Select value={sourceLift} onValueChange={setSourceLift}>
            <SelectTrigger className="bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIFT_ORDER.map(l => (
                <SelectItem key={l} value={l}>
                  {l} ({(LIFT_RATIOS[l] * 100).toFixed(0)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">1RM Weight (kg)</label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="e.g. 100"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="bg-secondary/50"
          />
        </div>
      </div>

      {theoreticalTotal !== null && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-primary">Theoretical Total</span>
            <span className="text-2xl font-bold text-primary">{theoreticalTotal.toFixed(1)} kg</span>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-primary/15 text-primary">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Lift</th>
              <th className="px-3 py-2 text-right font-semibold">%</th>
              <th className="px-3 py-2 text-right font-semibold">Predicted</th>
              <th className="px-3 py-2 text-right font-semibold">Actual</th>
              <th className="px-3 py-2 text-right font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.lift}
                className={`border-t border-border/30 ${r.isSource ? "bg-primary/5" : ""}`}
              >
                <td className="px-3 py-2 font-medium text-foreground">
                  {r.lift}
                  {r.isSource && (
                    <Badge className="ml-2 border-primary/30 bg-primary/20 text-primary text-[9px] px-1.5 py-0">
                      Source
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">{(r.ratio * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-right font-semibold text-primary">
                  {r.predicted !== null ? `${r.predicted} kg` : "—"}
                </td>
                <td className="px-3 py-2 text-right text-foreground">
                  {r.actual !== null ? `${r.actual} kg` : <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.delta !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        r.delta >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      <TrendingUp className={`h-3 w-3 ${r.delta < 0 ? "rotate-180" : ""}`} />
                      {r.delta > 0 ? "+" : ""}{r.delta}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!validInput && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Enter a weight to see projected maxes across all lifts.
        </p>
      )}
    </motion.div>
  );
}
