export type SportType = 'rugby' | 'basketball' | 'volleyball' | 'hybrid';
export type TestFamily = 'anthropometric' | 'jumps' | 'vma' | 'sprints' | 'run' | 'strength' | 'streetlifting' | 'weightlifting' | 'change_of_direction';

export interface TestDefinition {
  name: string;
  family: TestFamily;
  unit: string;
  sports: SportType[];
  description: string;
}

export const TEST_LIBRARY: TestDefinition[] = [
  // JUMPS
  { name: "CMJ (Counter Movement Jump)", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Jump from standing, arms free. Measures lower-body explosive power." },
  { name: "Abalakov Jump", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "CMJ with arm swing contribution. Compare to CMJ for arm coordination index." },
  { name: "Squat Jump (SJ)", family: "jumps", unit: "cm", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Jump from static squat position. No pre-stretch. Compare to CMJ for SSC efficiency." },
  { name: "Max Reach Jump", family: "jumps", unit: "cm", sports: ["basketball"], description: "Maximum height reached with one hand. Sport-specific for basketball." },
  { name: "Spike Jump", family: "jumps", unit: "cm", sports: ["volleyball"], description: "Jump simulating a spike approach. Measures volleyball-specific explosive power." },
  { name: "Broad Jump", family: "jumps", unit: "cm", sports: ["rugby", "hybrid"], description: "Standing horizontal jump. Measures horizontal power output." },
  // SPRINTS
  { name: "Sprint 5m", family: "sprints", unit: "s", sports: ["basketball", "hybrid"], description: "5-meter sprint from standing. First-step acceleration." },
  { name: "Sprint 10m", family: "sprints", unit: "s", sports: ["basketball", "volleyball", "hybrid"], description: "10-meter sprint. Acceleration phase." },
  { name: "Sprint 20m", family: "sprints", unit: "s", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "20-meter sprint. Transition from acceleration to top speed." },
  { name: "Sprint 40m", family: "sprints", unit: "s", sports: ["rugby", "hybrid"], description: "40-meter sprint. Maximum velocity assessment." },
  // CHANGE OF DIRECTION
  { name: "Lane Agility Drill", family: "change_of_direction", unit: "s", sports: ["basketball", "hybrid"], description: "NBA-standard agility test around the paint." },
  { name: "T-Test", family: "change_of_direction", unit: "s", sports: ["basketball", "volleyball", "hybrid"], description: "T-shaped agility test. Measures multi-directional speed." },
  { name: "T-Test Short", family: "change_of_direction", unit: "s", sports: ["volleyball"], description: "Shortened T-test version adapted for volleyball court dimensions." },
  { name: "Pro-Agility (5-10-5)", family: "change_of_direction", unit: "s", sports: ["rugby", "hybrid"], description: "NFL-style shuttle run. Lateral acceleration and deceleration." },
  { name: "5-0-5 Test", family: "change_of_direction", unit: "s", sports: ["rugby", "hybrid"], description: "180° change of direction test over 5 meters." },
  // VMA / ENDURANCE
  { name: "30-15 Intermittent Fitness Test (IFT)", family: "vma", unit: "km/h", sports: ["basketball", "hybrid"], description: "Berthoin protocol. Final stage speed = MAS. Optimal for team sports." },
  { name: "Repeated Jump Ability (RJA)", family: "vma", unit: "index", sports: ["volleyball"], description: "Repeated jump series assessing fatigue resistance and elastic energy reuse." },
  { name: "Bronco Test", family: "run", unit: "s", sports: ["rugby", "hybrid"], description: "Rugby-specific fitness test: 3 x 20m shuttle (x5). Total time recorded." },
  // STRENGTH
  { name: "½ Back Squat (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Half squat to 90°. Use Brzycki formula if testing with sub-maximal reps." },
  { name: "Trap Bar Deadlift (1RM)", family: "strength", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Hexagonal bar deadlift. Lower injury risk than conventional deadlift." },
  { name: "Power Clean (1RM)", family: "weightlifting", unit: "kg", sports: ["basketball", "volleyball", "rugby", "hybrid"], description: "Olympic lift. Gold standard for whole-body explosive strength." },
  { name: "Bench Press (1RM)", family: "strength", unit: "kg", sports: ["rugby", "hybrid"], description: "Flat bench press. Upper body pressing strength." },
];

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

export function getTestsForSport(sport: SportType): TestDefinition[] {
  if (sport === 'hybrid') return TEST_LIBRARY;
  return TEST_LIBRARY.filter(t => t.sports.includes(sport));
}
