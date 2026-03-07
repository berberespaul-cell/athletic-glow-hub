export type SportType = 'rugby' | 'basketball' | 'volleyball' | 'hybrid';
export type TestFamily = 'anthropometric' | 'jumps' | 'vma' | 'sprints' | 'run' | 'strength' | 'streetlifting' | 'weightlifting' | 'change_of_direction';

export interface TestDefinition {
  name: string;
  family: TestFamily;
  unit: string;
  sports: SportType[];
  description: string;
}

export const FAMILY_LABELS: Record<TestFamily, string> = {
  anthropometric: "Anthropometric",
  jumps: "Jumps",
  sprints: "Sprints",
  run: "Endurance",
  vma: "Endurance",
  strength: "Strength",
  weightlifting: "Weightlifting",
  streetlifting: "Streetlifting",
  change_of_direction: "Agility",
};

export const FAMILY_ORDER: TestFamily[] = [
  'jumps', 'sprints', 'change_of_direction', 'run', 'vma', 'strength', 'weightlifting', 'streetlifting', 'anthropometric',
];

export const TEST_LIBRARY: TestDefinition[] = [
  // JUMPS
  { name: "Squat Jump (SJ)", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Jump from static squat position. No pre-stretch." },
  { name: "Drop Jump (DJ)", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Drop from a box then immediately jump. Reactive strength." },
  { name: "CMJ (Counter Movement Jump)", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Jump from standing, arms free. Lower-body explosive power." },
  { name: "Abalakov Jump", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "CMJ with arm swing contribution." },
  { name: "Sergeant Test", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Standing vertical jump reach test." },
  { name: "Max Reach Jump", family: "jumps", unit: "cm", sports: ["basketball"], description: "Maximum height reached with one hand." },
  { name: "Spike Jump", family: "jumps", unit: "cm", sports: ["volleyball"], description: "Jump simulating a spike approach." },
  { name: "Broad Jump", family: "jumps", unit: "cm", sports: ["rugby", "hybrid"], description: "Standing horizontal jump. Horizontal power." },
  // SPRINTS
  { name: "Sprint 5m", family: "sprints", unit: "s", sports: ["basketball", "hybrid"], description: "5-meter sprint. First-step acceleration." },
  { name: "Sprint 10m", family: "sprints", unit: "s", sports: ["basketball", "volleyball", "hybrid"], description: "10-meter sprint. Acceleration phase." },
  { name: "Sprint 20m", family: "sprints", unit: "s", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "20-meter sprint. Acceleration to top speed." },
  { name: "Sprint 40m", family: "sprints", unit: "s", sports: ["rugby", "hybrid"], description: "40-meter sprint. Maximum velocity." },
  { name: "Sprint 100m", family: "sprints", unit: "s", sports: ["rugby", "hybrid"], description: "100-meter sprint. Speed endurance." },
  // AGILITY (change_of_direction)
  { name: "Lane Agility Drill", family: "change_of_direction", unit: "s", sports: ["basketball", "hybrid"], description: "NBA-standard agility test around the paint." },
  { name: "T-Test", family: "change_of_direction", unit: "s", sports: ["basketball", "volleyball", "hybrid"], description: "T-shaped agility test. Multi-directional speed." },
  { name: "T-Test Short", family: "change_of_direction", unit: "s", sports: ["volleyball"], description: "Shortened T-test for volleyball court." },
  { name: "Pro-Agility (5-10-5)", family: "change_of_direction", unit: "s", sports: ["rugby", "hybrid"], description: "NFL-style shuttle run." },
  { name: "5-0-5 Test", family: "change_of_direction", unit: "s", sports: ["rugby", "hybrid"], description: "180° change of direction test." },
  // ENDURANCE (run + vma)
  { name: "30-15 Intermittent Fitness Test (IFT)", family: "vma", unit: "km/h", sports: ["basketball", "hybrid"], description: "Berthoin protocol. Final stage speed = MAS." },
  { name: "Repeated Jump Ability (RJA)", family: "vma", unit: "index", sports: ["volleyball"], description: "Repeated jump series. Fatigue resistance." },
  { name: "Bronco Test", family: "run", unit: "s", sports: ["rugby", "hybrid"], description: "Rugby fitness: 3 x 20m shuttle (x5)." },
  { name: "5km Run", family: "run", unit: "min", sports: ["rugby", "hybrid"], description: "5km aerobic endurance." },
  { name: "10km Run", family: "run", unit: "min", sports: ["hybrid"], description: "10km long-distance endurance." },
  { name: "15km Run", family: "run", unit: "min", sports: ["hybrid"], description: "15km extended endurance." },
  { name: "Half Marathon (21km)", family: "run", unit: "min", sports: ["hybrid"], description: "21.1km half marathon." },
  { name: "Marathon (42km)", family: "run", unit: "min", sports: ["hybrid"], description: "42.195km marathon." },
  // STRENGTH
  { name: "Back Squat (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Full back squat. Primary lower-body strength." },
  { name: "½ Back Squat (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Half squat to 90°. Brzycki formula for sub-max." },
  { name: "Front Squat (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Front-loaded squat. Quads and core." },
  { name: "Zercher Squat (1RM)", family: "strength", unit: "kg", sports: ["rugby", "hybrid"], description: "Bar in elbow crease. Functional anterior chain." },
  { name: "Deadlift (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Conventional deadlift. Posterior chain max strength." },
  { name: "Trap Bar Deadlift (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Hexagonal bar deadlift. Lower injury risk." },
  { name: "RDL (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Romanian deadlift. Hamstring and hip hinge." },
  { name: "Bench Press (1RM)", family: "strength", unit: "kg", sports: ["rugby", "hybrid"], description: "Flat bench press. Upper body pressing." },
  { name: "Push Press (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Overhead press with leg drive." },
  // WEIGHTLIFTING
  { name: "Power Clean (1RM)", family: "weightlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Olympic power clean. Whole-body explosive strength." },
  { name: "Clean (1RM)", family: "weightlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Full clean from floor. Whole-body explosive power." },
  { name: "Muscle Clean (1RM)", family: "weightlifting", unit: "kg", sports: ["hybrid"], description: "Clean without full squat catch." },
  { name: "Hang Clean (1RM)", family: "weightlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Clean from hang. Second pull emphasis." },
  { name: "Hang Power Clean (1RM)", family: "weightlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Power clean from hang position." },
  { name: "Jerk (1RM)", family: "weightlifting", unit: "kg", sports: ["rugby", "hybrid"], description: "Overhead jerk from front rack." },
  { name: "Clean & Jerk (1RM)", family: "weightlifting", unit: "kg", sports: ["rugby", "hybrid"], description: "Full Olympic lift. Gold standard." },
  { name: "Snatch (1RM)", family: "weightlifting", unit: "kg", sports: ["hybrid"], description: "Full snatch. Mobility, speed, and power." },
  { name: "Power Snatch (1RM)", family: "weightlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Snatch caught in power position." },
  { name: "Muscle Snatch (1RM)", family: "weightlifting", unit: "kg", sports: ["hybrid"], description: "Snatch without squat catch." },
  { name: "Hang Snatch (1RM)", family: "weightlifting", unit: "kg", sports: ["hybrid"], description: "Snatch from hang position." },
  { name: "Hang Power Snatch (1RM)", family: "weightlifting", unit: "kg", sports: ["hybrid"], description: "Power snatch from hang." },
  // STREETLIFTING — all track Load (kg) + Reps
  { name: "Dips", family: "streetlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Dips with added load (kg). Track load + reps for relative strength." },
  { name: "Pull-Up", family: "streetlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Pull-ups with added load (kg). Track load + reps for relative strength." },
  { name: "Chin-Up", family: "streetlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Chin-ups with added load (kg). Track load + reps for relative strength." },
  { name: "Muscle-Up", family: "streetlifting", unit: "kg", sports: ["hybrid"], description: "Muscle-ups with added load (kg). Track load + reps for relative strength." },
];

// Recommended batteries per sport
export const SPORT_TEST_BUNDLES: Record<string, string[]> = {
  basketball: [
    "CMJ (Counter Movement Jump)", "Abalakov Jump", "Squat Jump (SJ)", "Max Reach Jump",
    "Sprint 5m", "Sprint 10m", "Sprint 20m",
    "Lane Agility Drill", "T-Test",
    "30-15 Intermittent Fitness Test (IFT)",
    "½ Back Squat (1RM)", "Trap Bar Deadlift (1RM)", "Power Clean (1RM)"
  ],
  volleyball: [
    "CMJ (Counter Movement Jump)", "Abalakov Jump", "Squat Jump (SJ)", "Spike Jump",
    "Sprint 10m", "Sprint 20m",
    "T-Test Short",
    "Repeated Jump Ability (RJA)",
    "½ Back Squat (1RM)", "Trap Bar Deadlift (1RM)", "Power Clean (1RM)"
  ],
  rugby: [
    "CMJ (Counter Movement Jump)", "Abalakov Jump", "Squat Jump (SJ)", "Broad Jump",
    "Sprint 20m", "Sprint 40m",
    "Pro-Agility (5-10-5)", "5-0-5 Test",
    "Bronco Test",
    "½ Back Squat (1RM)", "Bench Press (1RM)", "Trap Bar Deadlift (1RM)", "Power Clean (1RM)"
  ],
};

export function getTestsForSport(_sport: SportType): TestDefinition[] {
  return TEST_LIBRARY;
}

export function getRecommendedTestNames(sport: SportType): string[] {
  if (sport === 'hybrid') return [];
  return SPORT_TEST_BUNDLES[sport] || [];
}
