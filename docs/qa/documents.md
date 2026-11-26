# QA: document status, the 42501 licence card, autofill (2026-11-26)

- **Build:** Debug (existing simulator build; no native changes on this branch) + Metro, branch
  `feat/document-status-and-autofill`, iPhone 18 Pro simulator (iOS 27.2), one device at a time.
- **How:** dev launch states, no sign-in and no backend (`-qaScenario …`): `src/dev/QaDashboard.tsx`
  (`upload-documents-locked`, `upload-documents-expired`, `my-documents`) and the new
  `src/dev/QaDocuments.tsx` (`dl-locked`, `dl-expiring`, `dl-expired`, `dl-blocked`,
  `autofill-review-dl`, `autofill-review-insurance`; `-qaFile design/onboarding/sample-dl.png`, the DUMMY
  licence). Expiry dates are relative to the day the shot is taken, so each status stays right.
  **OCR_ENABLED stays off**: the review-form shots render the sheet with sample values as it opens
  after a successful read; no OCR call is made.
- Scrolling / tapping isn't possible on this headless simulator: the flows (taps, switching vehicle,
  relaunch, Confirm, Skip for now) are covered by Jest + msw (559 tests).

| # | Screenshot | Shows |
|---|---|---|
| 1 | `screens/documents/1-upload-active-expiring-locked.png` | Upload documents: RC **Expiring soon** and Insurance **Active**, both read-only (details, pill, View, "Already uploaded. You can upload a new one once it expires."), no upload / remove |
| 2 | `screens/documents/2-upload-expired.png` | RC and Insurance **Expired**: Upload File / Add Manually are back, with "This document has expired. Upload the new one." |
| 4 | `screens/documents/4-my-documents-status-pills.png` | My Documents list with the shared status pill |
| 5 | `screens/documents/5-dl-step-locked-active.png` | Onboarding 2/3, saved licence **Active**: the locked card; Next continues without saving |
| 6 | `screens/documents/6-dl-step-locked-expiring-soon.png` | Same, **Expiring soon** |
| 7 | `screens/documents/7-dl-step-expired-form.png` | Licence **Expired**: Expired card above an empty form for the new one |
| 8 | `screens/documents/8-dl-42501-blocked.png` | The 42501 "Hide deleted rows" refusal: inline card, the support message, **Skip for now** |
| 9 | `screens/documents/9-autofill-review-dl.png` | Autofill review for the licence: number read ("Auto-filled – please check"), the user's Issued on kept, empty Valid up to (as the live probe returned for the sample) |
| 10 | `screens/documents/10-autofill-review-insurance.png` | Autofill review for insurance, all three fields read |

Not captured: My Profile's Driving Licence section sits below the fold (no scrolling here); it uses the
same card as 5–7 and is covered by `documentLocks.test.tsx`. The "Reading your document…" spinner is
covered by tests (`documentAutofill.test.tsx`) only.
