# Web findings — vehicles, vehicle documents, master data (for onboarding 2/4 + 3/4)

> 2026-11-23 · Source: `demo.sterow.in` JS chunks, **read, never executed** (`index-*.js` My Vehicles /
> My Documents / Book Service, `my-documents-*.js`, `vehicle-master-*.js`), `docs/api/ENDPOINTS.md`,
> and a **read-only** live probe with the fixed test login (`scripts/smoke-onboarding.ts` →
> `docs/api/examples/onboarding.*.json`). Nothing was written to the backend.
>
> **Status: waiting for approval before C3 is implemented.**

## 1. `user_vehicles`

**Read (web "My Vehicles"):** `select('*').order('create_at', { ascending: false })`. RLS returns vehicles
the user owns **or** that are shared with them; `rpc/my_vehicle_access` gives the per-vehicle role
(`owner/family/driver/guest`). The test user has **0** vehicles (live `count=exact` → 0).

**Columns** (from the web's empty form `is()` + row mapper `ss()` + table filters):

| Column | Web rule (client-side) | App has it? |
|---|---|---|
| `vehicle_number` | **required**; `toUpperCase().replace(/\s+/g,'')` | ✅ Vehicle Number |
| `make_id` (uuid → `vehicle_make_master`) | **required** | ✅ Make (mock today) |
| `model_id` (uuid → `vehicle_model_master`) | **required** | ✅ Model (mock today) |
| `variant_id` (uuid → `vehicle_variant_master`) | **required** | ❌ **no Variant field** (Q2) |
| `fuel_type` | **required**, one of `Petrol, Diesel, Electric, CNG, Hybrid` | ✅ (app: lower-case keys → map) |
| `transmission_type` | **required**, one of `Manual, Automatic` | ⚠ app also offers **CVT** (Q3) |
| `color` | optional (`trim() \|\| null`) | ✅ Colour |
| `rc_number` | **required**, `trim().toUpperCase()`; RC OCR fills it, else = vehicle number | ❌ no field (Q4) |
| `registration_year` / `registration_month` | optional, both or neither; 1900–9999 / 1–12 | ❌ |
| `chassis_number` | optional, upper-case | ❌ |
| `current_odometer` | **required**, integer ≥ 0 | ⚠ app collects **Odometer on 4/4** (Q5) |
| `last_service_date` | optional date | ⚠ app collects it on 4/4 |
| `is_active` | default `true` | — |
| `rc_document` | storage path in bucket **`vehicle-rc`**: `<uid>/<uuid>.<ext>` (RC ≤ **5 MB**) | ✅ RC from 2/4 |
| `entry_method` | `'rc_upload'` if an RC file was attached, else `'manual'` | — |
| `create_at`, `updated_at` | server | — |

**Insert:** `insert({ ...row, rc_document, entry_method }).select('id').single()`; on error the uploaded RC
is removed. **`23505` → "This vehicle number is already registered."** (unique vehicle number,
apparently **across all users**: Q6). Vehicles can't be deleted by users (ENDPOINTS #61).
Whether the DB enforces the "required" columns (NOT NULL) is unknown: the rules above are the web's
client checks (Q2/Q4/Q5).

## 2. Master data (make → model → variant)

| Table | Web select | Live (test user) |
|---|---|---|
| `vehicle_make_master` | `id,name,is_active` order `name` | **34** makes (Aston Martin, Audi, Bentley, …), `logo` null |
| `vehicle_model_master` | `id,name,make_id,is_active[,body_style]` order `name` | **32** models (`make_id` FK, `body_style` e.g. Sedan) |
| `vehicle_variant_master` | `id,variant_name,model_id,fuel_type,transmission_type,is_active[,model_year]` | **3** variants only (e.g. "MG ZS EV Essence", Electric/Automatic) |

Picking a variant on the web pre-fills `fuel_type` / `transmission_type` from the variant. Inactive
rows are returned too (`is_active`); the app would show active ones only. With 3 variants, most models
have **no variant**, so the web's "Variant required" rule makes most vehicles unsaveable today (Q2).

## 3. Vehicle documents (3/4: RC, Insurance, Pollution)

One table per type, each row linked by **`vehicle_id`**; files in bucket **`vehicle-docs`** at
`<uid>/<table>/<uuid>.<ext>` (`document_path`), ≤ **10 MB**, `image/png|jpeg|webp|application/pdf`.
Insert: `from(table).insert(row).select('id').single()`; on failure the file is removed.

| Table | Required (web) | Other fields | Pre-filled from the vehicle |
|---|---|---|---|
| `vdocs_regcertificate` (RC) | `registration_number` | reg_date, valid_upto, address, body_type, fuel_type, chassis_number, engine_number, colour, seating_capacity, gross/unladen_weight | registration_number, fuel_type, chassis_number, colour; + `make_id, model_id, variant_id` |
| `vdocs_insurance` | `policy_no`, **`insurer`** | start/end_date, registration_number, policy_type (Third-party / Comprehensive/Package), chassis/engine no., IDV, premium, taxes, total | registration_number, chassis_number; + make/model/variant ids |
| `vdocs_pollution` (PUC) | `certificate_no` | registration_number, fuel_type, emission_test_datetime, validity_expiry_date, test_center, emission_co/hc, result (Pass/Fail) | registration_number, fuel_type |

The app's 3/4 collects **files only**, no policy / certificate numbers (Q7). Only the vehicle **owner**
may add documents (`my_vehicle_access` = owner). Live: 0 rows in each table for the test user.

Note the RC exists in two places on the web: the **`user_vehicles.rc_document`** file (bucket `vehicle-rc`,
uploaded with the vehicle) and an optional **`vdocs_regcertificate`** row (bucket `vehicle-docs`) (Q8).

## 4. Lookup + OCR

| Feature | Web | Public API (ENDPOINTS.md) | Live probe (empty body) |
|---|---|---|---|
| Number lookup | **none in the web UI** | `POST APP/vehicles/lookup { number }`, no auth | `400 "Required"`: **exists** |
| RC OCR | `/_serverFn/` (`{ image: dataUrl }` → make/model/variant **names**, vehicle_number, rc_number, fuel, colour, chassis, reg month/year; matched to master ids by normalised name) | `POST APP/ocr/rc { image }`, Bearer | `401`: **exists** |
| Document OCR | `/_serverFn/` (`{ table, image }` → field map for that vdocs table) | `POST APP/ocr/document { table, image }`, Bearer | `401`: **exists** |

The web never calls the public routes (it uses its own server functions, which the app must not use).
Plan: `vehicleLookupService.lookup()` and `ocrService.readRc()/readDocument()` return `unavailable` until
the backend confirms the public contracts (Q1); manual entry always works.

## 5. Open questions (need answers before / during C3)

| # | Question | Proposed default if no answer |
|---|---|---|
| Q1 | The public `APP/ocr/*` and `APP/vehicles/lookup` routes **exist** (401/400, not 404). Response shapes? Are they billed per call (Vahan / OCR provider)? May the app send a DL/RC image (`image` = data URL?)? | Keep `unavailable` (as instructed for the DL); wire behind the same interface once confirmed. |
| Q2 | `variant_id` is required on the web, but only **3 variants** exist. Is it NOT NULL in the DB? Add a Variant picker to 2/4 (not in Figma), or allow null? | Add an optional Variant select under Model when the model has variants; send `null` otherwise **if the DB allows it** (one test insert needed). |
| Q3 | `transmission_type` is `Manual \| Automatic` only. Drop **CVT** from 2/4, or map CVT → Automatic? | Drop CVT (Figma chip) or map to Automatic: designer/PO call. |
| Q4 | `rc_number` is required; the app has no field. OK to send `rc_number = vehicle_number` (what the web does when OCR has no RC number)? | Yes, send the vehicle number. |
| Q5 | `current_odometer` is required on the vehicle, but the app asks for Odometer on **4/4** (after documents). Save the vehicle on 2/4 with `current_odometer = 0` and PATCH it on 4/4, or create the vehicle only on 4/4? And do "Last service date / centre / type / amount" go to `user_vehicles.last_service_date` only, or to a service-history table? | Create on 2/4 Next (so 3/4 documents can link `vehicle_id`) with `current_odometer: 0`, PATCH `current_odometer` + `last_service_date` on 4/4. Centre / type / amount: **pending backend** (no table found). |
| Q6 | Is `vehicle_number` unique across all users (23505)? What should a user do if their car is already registered by someone else (share/transfer flow)? | Show "This vehicle number is already registered." and stay on 2/4. |
| Q7 | 3/4 uploads files only. Insurance needs `policy_no` + `insurer`, PUC `certificate_no`, RC `registration_number` on the web. Are these NOT NULL in the DB? Add fields, or allow file-only rows? | RC: `registration_number` = vehicle number. Insurance / PUC: need fields or nullable columns; if neither, upload RC only and mark Insurance/PUC **pending backend**. |
| Q8 | RC: attach to `user_vehicles.rc_document` (bucket `vehicle-rc`), create a `vdocs_regcertificate` row (bucket `vehicle-docs`), or both? | `rc_document` on the vehicle (as the web's Add vehicle) **and** a `vdocs_regcertificate` row only if 3/4 has an RC. |
| Q9 | Body type / make logos (`vehicle_make_master.logo` is null for all) — will they be filled for the Make sheet? | Text-only make list. |

## 6. Proposed C3 implementation (after approval)

- `vehicleMaster.service`: makes / models / variants (active, ordered), cached (React Query, 1 h) → replaces
  `constants/vehicleMock.ts` in `VehicleForm` (option `value` = uuid, `label` = name).
- `vehicle.service.createVehicle(form, rc?)`: RC → `vehicle-rc/<uid>/<uuid>.<ext>`, insert `user_vehicles`
  (`entry_method` `rc_upload|manual`), remove the RC on failure; 23505 → mapped message.
- `vehicleDocuments.service.saveDocument(vehicleId, kind, file)`: `vehicle-docs/<uid>/<table>/<uuid>.<ext>`
  + insert into the vdocs table (per Q7/Q8).
- `vehicle.service.updateService(vehicleId, { odometer, lastServiceDate })` on 4/4 (per Q5).
- `vehicleLookupService` / `ocrService.readRc` → `unavailable` (per Q1).
- msw tests for each service; the onboarding flow test drives 2/4 → 3/4 → 4/4 with the requests asserted.
