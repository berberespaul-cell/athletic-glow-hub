

## PerformLab v3 — Refactor Plan

### 1. Database Schema Changes (Migration)

**profiles table** — add `sex` column:
```sql
ALTER TABLE profiles ADD COLUMN sex TEXT; -- 'male', 'female', 'other'
```

**results table** — add `menstrual_phase` column:
```sql
ALTER TABLE results ADD COLUMN menstrual_phase TEXT; -- 'follicular', 'ovulation', 'luteal', 'menstruation'
```

**Streetlifting logic** — no schema change needed. The existing `value` + `reps` columns already support load+reps. The `value` field will store the **added load (kg)** and `reps` stores repetitions. Relative strength = `(bodyweight + value) / bodyweight` will be calculated in TypeScript.

**test_library seeding** — update existing streetlifting entries to use `kg` unit (load-based) and add missing snatch variations. Done via INSERT for new tests and UPDATE for existing ones.

---

### 2. Streetlifting Refactor (`sportTests.ts` + `calculations.ts`)

- Change all streetlifting entries to track **Load (kg)** + **Reps** instead of "Max Reps" / "1RM" split.
- Consolidate to 4 exercises: Dips, Pull-Up, Chin-Up, Muscle-Up — each with unit `kg` (added load).
- Update family labels: rename `change_of_direction` → use "Agility" label, rename `vma`/`run` → "Endurance".
- Add `isStreetlifting()` helper in calculations for the `(BW + Load)` relative strength formula.
- Ensure all 5 snatch variations exist in the library.

---

### 3. Profile & Auth Updates

**AuthPage** — add Sex selector (Male/Female/Other) during signup. Save to profile.

**ProfilePage** — add Sex field to the edit form.

**Persistent session** — Supabase JS client already persists sessions in localStorage by default. No code change needed.

---

### 4. Test Entry Refactor

- **Streetlifting tests**: show "Added Load (kg)" and "Reps" fields. Display computed `(BW + Load)` and relative strength `(BW + Load) / BW`.
- **Menstrual cycle phase**: show optional selector in wellness section, visible only when profile sex is `female` or `other`.
- **Wellness remains optional** (already implemented via collapsible).

---

### 5. Dashboard Refactor

**Remove**:
- Global wellness gauge card
- Any Z-score / benchmark references

**Keep & enhance**:
- Categorized summary by test family (already partially done)
- Latest value vs PB with trend % (already done)
- 1RM trends: show "True 1RM" vs "Est. 1RM (Brzycki)" labels
- Jump ratios (CMJ/SJ, CMJ/Abalakov) as small metric cards

**Add**:
- Contextual wellness: small icons/tooltips on result rows showing wellness score and menstrual phase when available (e.g., 😴 3.2/6, 🔴 Luteal)

---

### 6. Analytics Cleanup

- Remove any Z-score or benchmark comparison UI
- Keep: progression charts, CV%, jump ratios, relative force cards
- Add streetlifting relative strength cards: `(BW + Load) / BW`

---

### Technical Summary

```text
Files to modify:
├── supabase migration   → ADD sex, menstrual_phase columns; UPDATE/INSERT test_library
├── src/lib/sportTests.ts → Consolidate streetlifting, ensure snatch battery, update families
├── src/lib/calculations.ts → Add streetliftingRelativeStrength()
├── src/pages/AuthPage.tsx → Add sex selector on signup
├── src/pages/ProfilePage.tsx → Add sex field
├── src/pages/TestEntry.tsx → Streetlifting BW+Load UI, menstrual phase selector
├── src/pages/Dashboard.tsx → Remove wellness gauge, add jump ratios, contextual wellness icons
├── src/pages/AnalyticsPage.tsx → Remove Z-score refs (already clean), add streetlifting RF
```

