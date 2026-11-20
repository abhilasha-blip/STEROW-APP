# QA: Onboarding steps 2–4 (UI only), iOS Simulator

- **Date:** 2026-11-20
- **Build:** Debug, iPhone 18 Pro simulator (iOS 27.2), 402 × 874 pt @3x (the same frame size as Figma)
- **Gates:** `typecheck` ✅ · `lint` ✅ · `check:colors` ✅ · `jest` ✅ 307 tests / 28 suites (coverage thresholds met)
- **Designs:** `design/onboarding/` – SVG exports for 2, 2a, 2b and the "Uploading Vehicle RC" card (rendered to
  `png/*@2x.png` with `rsvg-convert`); **2c, 3 and 4 were only exported as 1x PNGs** (`png/*@1x.png`), so their
  values were measured from pixels (±0.5 pt). `png/step2-empty-figma@2x.png` is Figma's own 2x export of
  frame 2 (the reference for the header background, see below).
- **Sample content:** `design/onboarding/sample-rc.png` is the RC card cropped out of 2a exactly as the SVG
  frames it. QA only – it is not bundled in the app.

## How the screenshots were taken

A dev-only harness (`src/dev/QaOnboarding.tsx`, required from `App.tsx` under `__DEV__` only) opens a seeded
onboarding step from iOS launch arguments, so no sign-in or taps are needed and every shot is repeatable:

```sh
xcrun simctl launch booted com.sterow.app -qaScenario step3-rc -qaFile "$PWD/design/onboarding/sample-rc.png"
xcrun simctl io booted screenshot docs/qa/screens/onboarding/step3-rc.png
```

Scenarios: `step2-empty`, `step2-rc`, `step2-autofilled`, `step2-manual`, `step2-make-sheet`, `step3-empty`,
`step3-rc`, `step4-empty`, `step4-filled`.

**Release builds:** verified with `react-native bundle --platform ios --dev false --minify true`. The bundle
contains none of `QaOnboarding`, `qaScenario`, `qaFile`, the scenario names, `sample-rc` or `Settings.get`. The
only leftover is the `qaOpenMakeSheet` prop name, passed as the constant `false`. The side-by-side images in `screens/onboarding/compare/` show the
design (left) and the simulator (right) at the same scale, first viewport only.

| Screen | Screenshot | vs design |
|---|---|---|
| Step 3 – empty | `screens/onboarding/step3-empty.png` | `compare/step3-empty.png` ✅ |
| Step 3 – RC attached (from step 2) | `screens/onboarding/step3-rc.png` | `compare/step3-rc.png` ✅ (2a's RC preview geometry) |
| Step 4 – empty | `screens/onboarding/step4-empty.png` | `compare/step4-empty.png` ✅ |
| Step 4 – filled (chip selected) | `screens/onboarding/step4-filled.png` | `compare/step4-filled.png` – no filled design |
| SelectField sheet (Vehicle Make, 12 items → search) | `screens/onboarding/step2-make-sheet.png` | not designed |
| Step 2 – 2b auto-filled (chips selected) | `screens/onboarding/step2-autofilled.png` | `compare/step2-autofilled.png` ✅ |
| Step 2 – A empty / B RC / D manual | `step2-empty.png`, `step2-rc.png`, `step2-manual.png` | `compare/…` ✅ |

## Differences from the designs

Fixed during QA:

1. **First label 5 pt too high on steps 2–4.** The shared layout was tuned for step 1, which starts with the
   avatar. Figma puts the first label's cap height 33.6 pt below the sheet top → `FIRST_LABEL_OFFSET` (5.3 pt).
2. **Chips ~1.5 pt too wide** (≈5 pt for the selected one), so "CNG" wrapped to a second row. RN text boxes
   include ~1 pt of glyph side bearing that Figma's ink measurement doesn't → padding 16 (+1 border), check
   gap 6. Four fuel chips now fit on the first row, as in 2b/2c.
3. **₹ glyph too small** → 18 pt type (Figma's glyph is ~11 × 14 pt).
4. **RC preview geometry.** Step 1's DL preview is 300 × 180.9 (radius 15); 2a's RC is 300 × 190 (radius 10).
   UploadBox now contain-fits the image by its real aspect ratio inside a 300 × 190 area, with the radius per
   card. Step 1 is unchanged: its DL still lands at 300 × 180.9, 18.6 pt from the top.

Remaining (intentional or out of scope):

5. **2b shows the field focused with a spinner and the auto-filled fields at the same time.** The app spins only
   while the lookup runs (600 ms debounce + 1.5 s mock) and shows the fields afterwards. Both are in the screenshots
   as separate states; the focused border is the dark indigo from 2b.
6. **Header background (fixed).** Figma has three different headers: Sign In / Create Account use a diagonal
   violet gradient (the app matches it); onboarding step 1 uses base #1B1F5E and steps 2–4 base #14163A, both
   with the same two blurred violet glows. Onboarding now has its own tokens (`background.onboardingBase`)
   and `OnboardingBackground`, fitted to Figma's export: the app matches it within **2/255** at every sampled
   header point on steps 2, 3 and 4. Sign In is unchanged. rsvg renders these blur filters much darker than
   Figma, so the SVG renders were not used as the colour reference. Step 1 uses the same background for
   consistency (its frame's base is slightly lighter): to confirm with the designer.
7. **Selected chip border is 1 pt** (the SVG strokes it at 1 pt); the brief said 1.5 pt. The SVG was followed,
   which also keeps chips from shifting when selected.
8. **Upload card radius is 8** (the SVG); the brief said ~12. Same as step 1's box.
9. **Chip height:** 40 pt (2b SVG). The step 4 PNG measures ~38 pt; treated as export blur.
10. **Footer gaps vary in Figma** (49 / 55 / 59 / 59 pt). The layout takes a per-screen `footerGap` to match each frame.
11. **"Uploading…" card state** (progress ring + Cancel) is in the exports but needs the upload API. Not built.

## Product decisions (confirmed 2026-11-20)

| # | Topic | Decision / behaviour |
|---|---|---|
| 1 | Step 3 Next rule | ≥ 1 document (`MIN_DOCUMENTS_TO_CONTINUE = 1`); the RC is not mandatory. |
| 2 | Step 4 required fields | Last Service Date + Service Type. |
| 3 | Manual entry | "Enter details manually" keeps the vehicle number and clears only the looked-up fields. In manual mode "Find my vehicle by number" returns to lookup mode (hand-typed details are cleared; a valid number is looked up again). Required: Number + Make + Model + Fuel + Transmission; Colour optional. |
| 4 | Lookup not found | Manual mode with the number kept, plus a toast "We couldn't find this vehicle. Please enter details manually." (Mock: numbers ending in `0000`.) |
| 5 | Undesigned pieces | Kept as built (select sheet, suggestions dropdown, inline upload errors, PDF tile, step 4 filled, completion placeholder); designer sign-off from these screenshots. |
| 6 | Copy | "Amount" (not Figma's "Ammount"); "JPEG, PNG, PDF. Up to 10 MB" (not "Upto"). |
| 7 | Step 1 licence → step 3 | Prefills "Upload License" (removable on step 3 without touching step 1). |
| 8 | Disabled SelectField | Muted text and chevron, field at 50% opacity, `accessibilityState.disabled`; used for Model until a Make is chosen (visible in `step2-manual.png`). |

Still open for the designer: step 1's lighter header base (#1B1F5E vs #14163A), the "MG ZS" / "Essence" make–model
taxonomy (the API will define the lists), and the "Find my vehicle by number" link, which has no design (placed where 2b's
"Not your vehicle?" line sits).
