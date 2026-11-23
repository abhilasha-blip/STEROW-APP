# Web findings — vehicle documents (RC, Motor Insurance, Pollution, FASTag) for onboarding 3/3

> 2026-11-23 · Sources: `demo.sterow.in` JS chunks, **read, never executed** (`my-documents-*.js` = the
> document type config, `index-*.js` = the My Documents page, `dashboard-widget-*.js`,
> `users-directory-*.js`), `docs/api/openapi.json` / `ENDPOINTS.md` (#67–82), read-only live probes with
> the fixed test login (0 rows in every vdocs table). PostgREST's own schema endpoint (`GET /rest/v1/`)
> needs a secret key, so **database constraints (NOT NULL, FKs) are not visible to us**: "required" below
> means *required by the web's client-side checks*.
>
> **Status: waiting for approval before the Documents API is implemented.**

## 1. Common to all four

| Topic | Web behaviour |
|---|---|
| Tables | `vdocs_regcertificate` (RC), `vdocs_insurance`, `vdocs_pollution` (PUC), `vdocs_fastag`. One row per document; several per vehicle allowed (listed newest first). |
| Vehicle link | **Every row has `vehicle_id`** (→ `user_vehicles.id`). The page refuses to add a document without a vehicle ("Choose a vehicle"; with no vehicles: "You have no vehicles yet. Add one in My Vehicles to start adding documents."). |
| Who may add | Only the vehicle **owner** (`rpc/my_vehicle_access` → `access = 'owner'`); otherwise "Only the vehicle owner can add documents". Family / driver / guest can view. |
| Storage | Bucket **`vehicle-docs`**, path **`<uid>/<table>/<uuid>.<ext>`** (e.g. `…/vdocs_insurance/3f2c….pdf`), stored in the row's **`document_path`**. Upload without upsert; on a failed insert the file is removed; replacing a file removes the old object. |
| Files | `image/png`, `image/jpeg`, `image/webp`, `application/pdf`, ≤ **10 MB** ("Upload a JPEG, PNG, WebP or PDF file", "File must be 10 MB or smaller"). The **file is optional**: a row can be saved with fields only. |
| Display | Images: `createSignedUrls(paths, 300)` thumbnails; open: `createSignedUrl(path, 300)`. |
| Insert | `from(table).insert(row).select('id').single()`; edit = `update(row).eq('id', id)`. |
| Delete | Soft delete (`is_active=false`, `deleted_at`), file removed for real. |
| Expiry | Badges from `valid_upto` / `end_date` / `validity_expiry_date`: "Expired …", "Expires in N d" (≤ 30 d), "Valid till …". |
| OCR | `/_serverFn/` `{ table, image: dataUrl }` → a field map for that table ("Filled N fields from the document — please review"). Public twin: **`POST APP/ocr/document { table, image }`** (exists, 401 without a token). **Not called** (O1): stays `unavailable`. |
| Row building | Empty field → `null`; numbers validated (≥ 0, integers where noted); `registration_number` upper-cased without spaces; `chassis_number`, `engine_number` upper-cased; datetime → ISO. |
| Pre-fill from the vehicle | `registration_number` = vehicle number, `fuel_type`, `chassis_number`, `colour` (where the table has them). |

## 2. Per document

| | RC — `vdocs_regcertificate` | Motor Insurance — `vdocs_insurance` | Pollution (PUC) — `vdocs_pollution` | FASTag — `vdocs_fastag` |
|---|---|---|---|---|
| **Required (web)** | `registration_number` | `policy_no`, **`insurer`** | `certificate_no` | `fastag_id` |
| Optional | `reg_date`, `valid_upto` (dates), `address`, `body_type` (Hatchback / Sedan / SUV / MUV/MPV / Coupe / Convertible / Wagon/Estate / Pickup Truck / Van), `fuel_type` (Petrol / Diesel / Electric / CNG / Hybrid), `chassis_number`, `engine_number`, `colour`, `seating_capacity` (int ≥ 1), `gross_weight`, `unladen_weight` (kg) | `start_date`, `end_date` (end ≥ start), `registration_number`, `policy_type` (Third-party / Comprehensive/Package), `chassis_number`, `engine_number`, `insured_declared_value`, `premium_amount`, `taxes`, `total_amount` | `registration_number`, `fuel_type`, `emission_test_datetime`, `validity_expiry_date`, `test_center`, `emission_co` (%), `emission_hc` (ppm), `result` (Pass / Fail) | `registration_number`, `issuer_bank` |
| Expiry field | `valid_upto` | `end_date` | `validity_expiry_date` | — |
| Extra vehicle link | + `make_id`, `model_id`, `variant_id` copied from the vehicle | + `make_id`, `model_id`, `variant_id` | — | — |
| Card title | — (RC = the vehicle) | `policy_no` | `certificate_no` | `fastag_id` |
| App 3/3 today | ✅ card | ✅ card | ✅ card | ❌ no card (not in Figma) |

Separately, `user_vehicles.rc_document` holds an RC file in bucket **`vehicle-rc`** (`<uid>/<uuid>.<ext>`, ≤ 5 MB),
uploaded with the vehicle itself; the `vdocs_regcertificate` row is the RC *document record* (bucket `vehicle-docs`).

## 3. The gap for a 3-step onboarding

The 3/3 screen collects **files only** and onboarding no longer has a vehicle step, but on the web every
document needs **a vehicle the user owns** plus at least one **typed field** (registration / policy +
insurer / certificate / FASTag id). Creating a vehicle on the web needs vehicle number, make, model,
**variant** (3 exist), fuel, transmission, RC number and odometer (`web-vehicle-findings.md` §1).

## 4. Options — proposal

> I don't have the message that defined your (a) and (b), so here they are as I understand the choice.
> Correct me if yours were different.

**(a) Vehicle-first: documents attached to a vehicle, as on the web.** 3/3 starts with a vehicle: the
Vehicle Number (+ make / model / fuel / transmission from `VehicleForm`, or from the RC once OCR /
lookup exist), creates `user_vehicles`, then saves each card as a vdocs row with `vehicle_id`:
RC → `registration_number` = vehicle number; Insurance → asks **Policy number + Insurer**; PUC → asks
**Certificate number**; FASTag → asks **FASTag ID** (new card).
- ✅ No backend change; matches the web exactly; documents show up in the web's My Documents.
- ❌ 3/3 grows back into a vehicle form plus 1–2 fields per card; still blocked by `variant_id` /
  `rc_number` / `current_odometer` being required (Q2/Q4/Q5) unless the backend relaxes them.

**(b) User-level documents now, linked to a vehicle later.** 3/3 stays "upload files": each file goes to
`vehicle-docs/<uid>/<table>/<uuid>.<ext>` and a vdocs row is created **without `vehicle_id`** (and with
the typed number optional); My Vehicles links them later.
- ✅ Keeps the 3-step design; OCR can fill the numbers later without a UI change.
- ❌ Needs backend changes: `vehicle_id` nullable + a `user_id` owner column and RLS on it (today RLS goes
  through the vehicle owner), and the required columns nullable. The web would need to show unlinked
  documents.

**Recommendation: (a)** if the backend can't change this sprint, because it works today and matches the web.
The cost is a heavier 3/3: a vehicle block on top plus one or two number fields per card. **(b)** is the better product if
the backend can make the four changes above. Either way, I propose:
1. **One approved test write** with 9999999999 (a vehicle + one vdocs row, then soft-delete) to learn the
   real NOT NULL / FK / RLS rules instead of guessing from client code.
2. Add the **FASTag** card to 3/3 (the web has 4 document types; Figma shows 3) only if you want it there.

## 5. Open questions

| # | Question |
|---|---|
| D1 | (a) or (b)? For (b): will the backend add `user_id`, make `vehicle_id` nullable and update RLS? |
| D2 | DB-level required columns of each vdocs table (only client checks are visible). OK to run one test insert to find out (D-test above)? |
| D3 | RC on onboarding: `user_vehicles.rc_document` (bucket `vehicle-rc`), a `vdocs_regcertificate` row (bucket `vehicle-docs`), or both? (= Q8) |
| D4 | FASTag on 3/3? Not in Figma. |
| D5 | `APP/ocr/document` contract (field names per table = the web's?), cost, consent (= O1). Until then: `unavailable`. |
| D6 | Routing: "documents done" = any vdocs row (implemented). OK, or should it require a specific one (e.g. RC)? |
