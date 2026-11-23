# QA: Dashboard, drawer, light screens and the new 3/3 (2026-11-23)

- **Build:** Debug, branch `feat/dashboard-ui`, iPhone 18 Pro simulator (iOS 27.2), Metro.
- **Designs:** `design/dashboard/` (copied from the Figma exports in Downloads; `drivers.svg` was the Share
  Access screen and is stored as `share-access.svg`). Renders in `design/dashboard/png/` (rsvg-convert; the
  three SVGs with >10 MB embedded images via headless Chrome).
- **How the screenshots were taken:** the dev launch states (`-qaScenario …`, `src/dev/QaOnboarding.tsx`,
  `src/dev/QaDashboard.tsx`) open each screen with seeded data; no sign-in or taps are possible on this
  machine (no UI automation). Behaviour is covered by Jest + msw (46 suites, 399 tests).
- **Not visible in the screenshots:** content below the fold (the simulator can't be scrolled from here):
  the dashboard's health banner / Quick Links, 3/3's PUC / FASTag cards, the drawer's last two rows.

| Screen | Design | App | Differences |
|---|---|---|---|
| 3/3 Your Vehicle Documents (empty) | `vehicle-documents-step.jpeg` | ![](screens/dashboard/p1-step3-empty.png) | "3/3" (design says 3/4, see questions); no vehicle yet → "Add your vehicle" (design shows a selected vehicle); icon tiles are violet-tinted (the JPEG reads slightly greyer); selector 44pt tall (≈ 41 in the JPEG, kept for the touch target); FASTag card added last (not in the design). |
| 3/3 with documents | — | ![](screens/dashboard/p1-step3-filled.png) | States not in the design: "✓ Added", the file preview + remove, "Add details" + the hint for an Insurance file without its details. |
| Dashboard (complete) | `png/dashboard.png` | ![](screens/dashboard/p2-dashboard-complete.png) | Header glow approximated with a radial gradient (Figma: blur 177); the status bar is dark only in the QA launch (the app sets light content on the dashboard). |
| Dashboard incomplete (variant 1: has a vehicle) | `png/dashboard-incomplete.png` | ![](screens/dashboard/p2-dashboard-incomplete.png) | Shows the user's vehicle in the carousel (the design shows "N/A" with the grid: we show N/A only without a vehicle, which is variant 2); % is computed (67%) vs the design's sample 50%. |
| Dashboard incomplete (variant 2: no vehicle) | `png/dashboard-incomplete-2.png` | ![](screens/dashboard/p2-dashboard-incomplete-2.png) | Matches; the designs show the Home tab unselected, the app keeps Home selected. |
| Side drawer | `png/side-drawer.png` | ![](screens/dashboard/p3-drawer.png) | Matches; on the 874pt-tall phone the last rows (Help, Change Language) scroll (the Figma frame is 1039pt). |
| My Profile | `my-profile.png` | ![](screens/dashboard/p4-my-profile.png) | DOB / Emergency Contact show "Add" (no backend field yet); completion from the onboarding parts; Home tab selected (the design shows none). |
| My Documents | `png/my-documents.png` | ![](screens/dashboard/p4-my-documents.png) | Status pills also show "Expiring soon" (orange) / "Expired" (red); "Change" only when there's more than one vehicle. |
| Share Access | `png/share-access.png` | ![](screens/dashboard/p4-share-access.png) | Matches (mock data; API later). |
| My Vehicles | — (no Figma) | ![](screens/dashboard/p4-my-vehicles.png) | Placeholder list using the carousel card + "Add vehicle". |

## Data per element

| Element | Source |
|---|---|
| Name, email, avatar | `user_details` (profile service) |
| Vehicles (carousel, Vehicles tile, selector) | `user_vehicles` active, names embedded |
| My Documents tile, list | `vdocs_*` rows + `user_driving_licenses` |
| Share Access tile | `vehicle_shares` count (screen: mock people) |
| Book Service tile | `service_bookings` count |
| Service History, Challans, health 80%, Quick Links, bell, SOS | **static placeholders / Coming soon (TODO)** |
| Profile completion % | onboarding parts done: profile (name + email), licence, a vehicle |

## Design questions

1. **3/4 vs 3/3:** the vehicle-documents design shows "3/4"; the agreed flow has 3 steps, so the app shows 3/3.
2. **FASTag card:** not in the design; added last in the same card style (agreed flow). Please add it to Figma.
3. **Incomplete variant:** we show variant 2 (task list) when the user has **no vehicle**, variant 1 (grid)
   otherwise. Variant 1's "N/A" card only makes sense without a vehicle; confirm.
4. **My Vehicles:** no Figma yet; placeholder list.
5. **Tab state on drawer screens:** the designs show no tab selected on My Profile / My Documents / Share
   Access; in the app they live in the Home tab, so Home stays selected.
6. **Header bell + SOS:** in the design but not in the brief; they open Coming soon.
7. **Dog photo:** the dashboard SVG embeds an unrelated dog photo under the carousel car (hidden by the car
   image); not used in the app.
