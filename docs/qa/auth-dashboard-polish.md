# QA: auth + dashboard polish (2026-11-25)

- **Build:** Debug, branch `fix/auth-dashboard-polish`, iPhone 18 Pro simulator (iOS 27.2) + Metro;
  Android `assembleDebug` on the `Medium_Phone_API_37.0` emulator (one device at a time).
- **How:** dev launch states (`-qaScenario …`: `src/dev/QaDashboard.tsx`, `QaOnboarding.tsx`, new
  `QaFields.tsx`). The simulator runs headless (no Simulator.app window, no idb / XCUITest), so nothing
  can be typed or tapped: interaction is covered by Jest + msw (486 tests).
- **Measurements:** design headers rendered from `design/dashboard/*.svg` with headless Chrome at 3×;
  glyph boxes measured from the PNGs (script-free pixel scans).

| # | Item | Screenshots | Notes |
|---|---|---|---|
| 1 | Profile-completion badge | `1-badge-17.png`, `1-badge-67.png`, `1-badge-83.png`, `1-badge-100-hidden.png`, `1-my-profile-100.png` | 6 items, equal weight; mobile always done, so an empty profile is 17%, not 0%. |
| 2 | Dashboard header vs Figma | `2-header-vs-figma-complete.png`, `-incomplete.png`, `-incomplete-2.png` | The Figma export itself draws the car JPEG as a plain rect (hard black edge, no mask / blend); the app fades its left (120pt) and top (70pt) edges. Text within ~1pt of the outlined Figma text. Status bar is dark only in the QA launch. |
| 3 | UAE typing / backspace | — | Needs native keystrokes (not possible here). Proven by RN's TextInput source (`text = value ?? defaultValue`) + tests that fail before / pass after. |
| 4 | Sign In ⇄ Sign Up reset | — | Needs taps; Jest only. Back from Verify OTP still keeps the number (existing "change number" behaviour). |
| 5 | Clipped descenders | `5-ios-fields-before.png` / `-after.png`, `5-ios-descenders-zoom-*.png`, `5-ios-onboarding-profile.png`, `5-android-fields-after.png`, `5-android-descenders-before-after*.png` | Clipping did **not** reproduce on these two devices (also not at Android font scale 1.3); the lineHeight fix is preventive. iOS centring kept within 0.3pt of before. |
| 6 | Full Name validation | — | Messages appear after blur / submit (needs typing); Jest only. |
| 7 | Too many wrong OTPs | — | Not triggered live (exact server text unpublished; see the commit). Jest + msw only. |

## Open questions

1. **Exact "too many" response:** please share the server's status + message for too many wrong codes
   (and for too many OTP requests) so the mapping can match it exactly; it currently matches any
   "too many" text, HTTP 429 or a rate-limit code.
2. **Header art:** the fade is our addition (the Figma layer has none). Confirm with design, or get a
   car image already blended into the gradient.
3. **Leading punctuation in names** ("-Ravi") is now allowed (not in the agreed rules).
