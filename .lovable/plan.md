

## Sport Science Performance Tracker

A high-end athlete performance tracking app with Whoop/Strava-inspired dark UI (charcoal `#121212`, electric orange `#FF5733`, glassmorphism panels).

---

### Authentication & Roles
- **Supabase Auth** with email/password signup and login
- **Two roles**: Athlete and Coach (stored in a `user_roles` table)
- Coaches can invite athletes and view their team's data; athletes manage only their own profile and results

### Database (Supabase)
Implements the provided schema exactly:
- `profiles` — name, sport (rugby/basketball/volleyball/hybrid), body metrics, position
- `test_library` — seeded with the 22 tests from the blueprint, each tagged with applicable sports
- `results` — test values, reps (for Brzycki 1RM), wellness sub-scores (fatigue, sleep, soreness), auto-computed wellness_score
- `benchmarks` — normative data per test/sport/level for Z-score calculations
- `user_roles` — separate table for coach/athlete roles with security-definer helper
- Full RLS so athletes see only their own data; coaches see their linked athletes

### Pages & Features

**1. Login / Signup**
- Dark-themed auth pages with glassmorphism card
- Role selection (Athlete or Coach) during signup
- Sport selection for athletes during onboarding

**2. Dashboard**
- Wellness score gauge (color-coded: green/amber/red) from latest session
- Quick stats: best CMJ, latest 1RM, sprint PBs
- Recent test results feed with progression deltas (↑/↓ %)
- For coaches: team overview cards showing each athlete's wellness and key metrics

**3. Profile / Settings**
- Edit name, sport, position, weight, height, birth date
- **When sport is changed**, the test battery automatically updates to show only the sport-specific tests from `SPORT_TEST_BUNDLES`
- Hybrid mode shows all tests

**4. Test Entry**
- Select a test from the sport-filtered battery
- Enter value, optional reps (triggers Brzycki 1RM auto-calculation for strength tests)
- Wellness check-in: 3 sliders (fatigue, sleep, soreness) on 1–6 scale
- Session date picker and notes field
- Confirmation with computed metrics shown immediately (relative force, estimated 1RM)

**5. Analytics & Charts**
- **Progression charts** — line graphs per test over time with % delta annotations
- **Z-Score radar chart** — spider/radar comparing athlete across all tests vs. benchmarks
- **Jump ratios panel** — CMJ/SJ ratio and CMJ/Abalakov ratio with interpretation labels
- **Coefficient of Variation** — consistency indicator per test
- **Relative force** — 1RM/BW for strength tests
- For coaches: side-by-side athlete comparison view

### Calculations (TypeScript)
All formulas from the blueprint implemented as utility functions:
- `brzycki1RM`, `cmjSjRatio`, `cmjAbalakovRatio`, `zScore`, `zScoreLabel`, `relativeForce`, `wellnessScore`, `wellnessLabel`, `progressionDelta`, `coefficientOfVariation`

### Design System
- Background: `#121212` deep charcoal
- Accent: `#FF5733` electric orange for CTAs, active states, highlights
- Cards: glassmorphism (semi-transparent backgrounds, backdrop blur, subtle borders)
- Typography: clean sans-serif, high contrast white text
- Charts: orange gradient fills on dark backgrounds

