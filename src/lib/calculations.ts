// ── 1RM ESTIMATION (Brzycki Formula) ─────────────────
export function brzycki1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps >= 37) throw new Error("Brzycki formula invalid for 37+ reps");
  return parseFloat((weight / (1.0278 - 0.0278 * reps)).toFixed(2));
}

// ── JUMP RATIOS ───────────────────────────────────────
export function cmjSjRatio(cmj_cm: number, sj_cm: number): number {
  if (sj_cm === 0) throw new Error("SJ cannot be 0");
  return parseFloat((cmj_cm / sj_cm).toFixed(3));
}

export function cmjAbalakovRatio(cmj_cm: number, abalakov_cm: number): number {
  if (abalakov_cm === 0) throw new Error("Abalakov value cannot be 0");
  return parseFloat((cmj_cm / abalakov_cm).toFixed(3));
}

// ── Z-SCORE ───────────────────────────────────────────
export function zScore(
  athleteValue: number,
  populationMean: number,
  stdDev: number,
  isLowerBetter: boolean = false
): number {
  if (stdDev === 0) throw new Error("Standard deviation cannot be 0");
  const z = (athleteValue - populationMean) / stdDev;
  return parseFloat((isLowerBetter ? -z : z).toFixed(2));
}

export function zScoreLabel(z: number): { label: string; color: string } {
  if (z >= 2)  return { label: "Elite",          color: "hsl(142 71% 45%)" };
  if (z >= 1)  return { label: "Above Average",  color: "hsl(84 81% 44%)" };
  if (z >= -1) return { label: "Average",         color: "hsl(38 92% 50%)" };
  if (z >= -2) return { label: "Below Average",  color: "hsl(25 95% 53%)" };
  return         { label: "Needs Work",           color: "hsl(0 84% 60%)" };
}

// ── RELATIVE FORCE ────────────────────────────────────
export function relativeForce(oneRM_kg: number, bodyWeight_kg: number): number {
  if (bodyWeight_kg === 0) throw new Error("Body weight cannot be 0");
  return parseFloat((oneRM_kg / bodyWeight_kg).toFixed(3));
}

// ── STREETLIFTING RELATIVE STRENGTH ───────────────────
// For streetlifting: relative strength = (BW + added load) / BW
export function streetliftingRelativeStrength(addedLoad_kg: number, bodyWeight_kg: number): number {
  if (bodyWeight_kg === 0) throw new Error("Body weight cannot be 0");
  return parseFloat(((bodyWeight_kg + addedLoad_kg) / bodyWeight_kg).toFixed(3));
}

// ── WELLNESS SCORE ────────────────────────────────────
export function wellnessScore(fatigue: number, sleep: number, soreness: number): number {
  return parseFloat(((fatigue + sleep + soreness) / 3).toFixed(2));
}

export function wellnessLabel(score: number): { label: string; color: string } {
  if (score >= 4.5) return { label: "Optimal",          color: "hsl(142 71% 45%)" };
  if (score >= 3.0) return { label: "Monitor",           color: "hsl(38 92% 50%)" };
  return              { label: "Overtraining Risk",     color: "hsl(0 84% 60%)" };
}

// ── PROGRESSION DELTA ─────────────────────────────────
export function progressionDelta(
  previousValue: number,
  currentValue: number,
  isLowerBetter: boolean = false
): number {
  if (previousValue === 0) return 0;
  const delta = ((currentValue - previousValue) / previousValue) * 100;
  return parseFloat((isLowerBetter ? -delta : delta).toFixed(2));
}

// ── COEFFICIENT OF VARIATION ──────────────────────────
export function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return parseFloat(((stdDev / mean) * 100).toFixed(2));
}

// ── TIME-BASED TEST CHECK ─────────────────────────────
const TIME_BASED_FAMILIES = ['sprints', 'run', 'change_of_direction'];
export function isLowerBetter(family: string): boolean {
  return TIME_BASED_FAMILIES.includes(family);
}

// ── STRENGTH TEST CHECK ───────────────────────────────
const STRENGTH_FAMILIES = ['strength', 'weightlifting', 'streetlifting'];
export function isStrengthTest(family: string): boolean {
  return STRENGTH_FAMILIES.includes(family);
}

// ── STREETLIFTING CHECK ───────────────────────────────
export function isStreetlifting(family: string): boolean {
  return family === 'streetlifting';
}
