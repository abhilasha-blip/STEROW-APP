# OCR findings — autofill from an uploaded document

> 2026-11-26 · Sources: `demo.sterow.in` JS chunks **read, never executed** (`driving-license-form-*.js`,
> `index-*.js` (My Vehicles + My Documents), `swagger-*.js` (the public API's own OpenAPI)),
> `docs/api/openapi.json` / `ENDPOINTS.md` #50–52. Earlier notes: `web-profile-dl-findings.md` (OCR),
> `web-vehicle-findings.md` §4, `web-documents-findings.md` §1.

## 1. Two OCR surfaces

| | Web (internal) | Public APP route (what the app may call) |
|---|---|---|
| Licence | `useServerFn(extractDl)({ data: { image } })` | `POST /api/public/v1/ocr/driving-license { image }` (Bearer) |
| RC (vehicle form) | `useServerFn(extractRc)({ data: { image } })` | `POST …/ocr/rc { image }` (Bearer) |
| RC / insurance / PUC / FASTag (My Documents) | `useServerFn(extractDoc)({ data: { table, image } })` | `POST …/ocr/document { table, image }` (Bearer) |

The web only calls its own `/_serverFn/` functions (hashed per build; `check:urls` bans them in the app).
The public routes are the same functions behind the APP envelope: the web's swagger chunk registers
`/ocr/rc` → `extractRcFn`, `/ocr/document` → `extractDocFn`, `/ocr/driving-license` → `extractDlFn`, all
`auth: true`. The app calls **only the public routes**, and only from `src/api/services/ocr.service.ts`.

## 2. Request

- `image`: a **data URL**, `data:<mime>;base64,<…>`, exactly what `FileReader.readAsDataURL(file)`
  produces (the swagger text: *"base64 data URL of the image (data:image/jpeg;base64,...)"*). The web
  sends whatever file was picked (PNG / JPEG / WebP; the DL form also accepts a PDF).
- `table` (documents only): `vdocs_regcertificate` | `vdocs_insurance` | `vdocs_pollution` | `vdocs_fastag`.
- Headers: `Authorization: Bearer <user access token>`, `Content-Type: application/json`.
- The app builds the data URL from the picked file (`readLocalFile` → base64, `src/utils/base64.ts`).
  Photos come from the picker already downscaled (JPEG), so the body stays a few hundred KB.

## 3. Response (as the web reads it)

APP envelope: `200 { data: … }` / `4xx { error: { code, message } }` (openapi: 400 / 401).

**Licence** (`driving-license-form-*.js`):

```js
let t = await extractDl({ data: { image: await toDataUrl(file) } });
setForm(f => ({
  dl_number: t.dl_number || f.dl_number,
  issued_on: t.issued_on || f.issued_on,
  valid_upto: t.valid_upto || f.valid_upto,
  vehicle_classes: t.vehicle_classes.length ? t.vehicle_classes : f.vehicle_classes,
}));
toast.success('Details filled from your licence — please review.');
// catch: toast.error(e.message ?? 'Could not read the licence')
```

→ `{ dl_number: string, issued_on: "YYYY-MM-DD" | "", valid_upto: "YYYY-MM-DD" | "", vehicle_classes: string[] }`.
On save the web sends `dl_number.trim().toUpperCase()`.

**Documents** (`index-*.js`, My Documents):

```js
const n = await extractDoc({ data: { table: type.table, image: dataUrl } });
const count = Object.keys(n).length;
setDraft(d => ({ ...d, form: { ...d.form, ...n } }));   // keys = the table's columns
count ? toast.success(`Filled ${count} field${count > 1 ? 's' : ''} from the document — please review`)
      : toast.info('No details found — please fill the form');
// catch: toast.error(e.message ?? 'Could not read the document')
```

→ a **partial column map of that table** (only what was read):

| Table | Columns the app uses |
|---|---|
| `vdocs_regcertificate` | `registration_number`, `reg_date`, `valid_upto`, `fuel_type`, `chassis_number`, `engine_number`, `colour` (+ `address`, `body_type`, `seating_capacity`, weights: not in the review form) |
| `vdocs_insurance` | `policy_no`, `insurer`, `end_date` (+ `start_date`, `policy_type`, amounts) |
| `vdocs_pollution` | `certificate_no`, `validity_expiry_date` (+ `test_center`, emissions, `result`) |
| `vdocs_fastag` | `fastag_id` (+ `issuer_bank`) |

**RC from the vehicle form** (`/ocr/rc`, `index-*.js`): `{ vehicle_number, rc_number, make, model,
variant, fuel_type, color, chassis_number, registration_year, registration_month }`; the web matches
make / model / variant **names** to the master ids. The app's RC card uses `/ocr/document` (the RC
table's columns, incl. `valid_upto` and `engine_number`, which `/ocr/rc` lacks) and also accepts
`make` + `model` / `color` / `rc_number` as aliases if they come back.

## 4. What the app does with it

- `ocrService.read(docType, file)` → `ok { fields } | unavailable | failed { reason }`;
  `docType` = `dl | rc | insurance | pollution | fastag`.
- **Flag `OCR_ENABLED` (`src/config/features.ts`, default `false`)**: off → `unavailable`, no request;
  the user fills the form as today.
- Merge rule (as the web): a read value replaces a form value **only if non-empty**; dates normalised
  to `YYYY-MM-DD` (also accepts `DD/MM/YYYY`, `DD-MM-YYYY`, timestamps); DL / registration / policy /
  certificate / FASTag / chassis / engine numbers upper-case and trimmed (`src/utils/documentAutofill.ts`).
- Failures → the manual form + the toast *"Could not read the document. Please enter the details."*:
  a timeout (30 s), a 4xx / "could not read" error, an empty map, or `confidence` < 0.5 if the
  response carries one (the web shows no confidence; this is defensive).
- Review form: every field editable; the read ones marked *"Auto-filled – please check"*; Confirm puts
  them in the card / form, saved with the rest on Next / Save.
- Not used: `vehicle_classes` (the app doesn't collect them yet); RC make / model text is shown for
  review but not saved (it needs the master-id matching the web does).

## 5. Live probe of the public route (2026-11-26, one call, approved)

Exactly **one** call, no retry: `scripts/probe-ocr.ts --yes`. The shape only (no token, no image, no
values) is in `docs/api/examples/ocr.driving-license.probe.json`.

| | |
|---|---|
| Request that worked | `POST https://demo.sterow.in/api/public/v1/ocr/driving-license`, `Authorization: Bearer <access token of the test account 9999999999>`, `Content-Type: application/json`, body `{ "image": "data:image/png;base64,<…>" }` (the DUMMY `design/onboarding/sample-dl.png`, a PNG data URL as-is) |
| Status | **200** |
| Time | **4.9 s** (4927 ms, incl. upload of the ~PNG body) |
| Envelope | `{ "data": { … } }` (the APP envelope; the app's client unwraps `data`) |

Every field returned:

| Field | Type in this response | Notes |
|---|---|---|
| `data.dl_number` | string (non-empty) | Read from the sample card. |
| `data.issued_on` | string, **empty** (`""`) | The sample shows no issue date. |
| `data.valid_upto` | string, **empty** (`""`) | The sample shows no validity. |
| `data.vehicle_classes` | array, **empty** (`[]`) | |
| confidence | **not present** | No confidence field at any level. |

So the public route matches the web's internal shape exactly (`{ dl_number, issued_on, valid_upto,
vehicle_classes }`); missing values come back as `""` / `[]` (not `null`, not left out). The app's
parser already handles this: empty values are dropped, so a partial read pre-fills only the number and
keeps what the user had for the dates. The confidence check stays defensive (unused by this route).
Date format for a filled date could not be seen (both empty on the sample); the app accepts
`YYYY-MM-DD`, timestamps and `DD/MM/YYYY`. `/ocr/document` and `/ocr/rc` were **not** probed (one call only).

## 6. Open questions for the backend

1. Is the public `/ocr/*` billed per call (OCR provider)? Any rate limit per user?
2. Exact response of `/ocr/driving-license` and `/ocr/document` through the APP envelope
   (`{ data: { … } }`?), and the error code / message when nothing can be read.
3. Is a PDF accepted as the `image` data URL (the web DL form allows PDFs)?
4. Consent / privacy wording for sending a licence image to the OCR provider.
