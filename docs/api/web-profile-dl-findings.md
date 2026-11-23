# Web findings — My Profile + Driving licence (for onboarding 1/4)

> 2026-11-23 · Source: `demo.sterow.in` JS chunks, **read, never executed** (`profile-*.js`,
> `driving-license-form-*.js`, `access-*.js`, `route-*.js`) + a read-only live probe
> (`scripts/smoke-onboarding.ts`, fixed test login). Re-created on this branch: the
> `web-profile-dl-findings.md` referenced in the phase 1 brief was not in the repo or on disk.

## Profile (`/profile`)

| What | Web code | Notes |
|---|---|---|
| Load | `access` query: `user_details` by `id = uid` | Columns (live): `id, email, full_name, phone, department, designation, avatar_url, is_active, created_at, updated_at, referral_code, deleted_at, deleted_by`. **No DOB column.** |
| Save name | `from('user_details').update({ full_name }).eq('id', uid)` → toast **"Profile saved"** | Only `full_name` is editable. |
| Email | `<input value={user.email} disabled>` (auth email, read-only) | Phone sign-ups get a synthetic `<10 digits>@phone.local` address: never shown in the app. |
| Mobile | `user_details.phone`, read-only | |
| Photo upload | `storage.from('avatars').upload(\`${uid}/${Date.now()}-${file.name}\`, file, { upsert: true })` | `accept="image/*"`. |
| Photo save | `from('user_details').update({ avatar_url: path }).eq('id', uid)` → toast **"Photo updated"** | `avatar_url` stores the **storage path**, not a URL. |
| Photo display | `storage.from('avatars').createSignedUrl(path, 3600)` | Private bucket; 1 h signed URL. |

## Driving licence (profile card + dashboard prompt)

| What | Web code | Notes |
|---|---|---|
| Load | `from('user_driving_licenses').select('*').eq('user_id', uid).maybeSingle()` | One row per user. Live: none for the test user yet. |
| File display | `storage.from('driving-licenses').createSignedUrl(document_path, 3600)` | |
| File upload | `storage.from('driving-licenses').upload(\`${uid}/${Date.now()}-${name.replace(/[^\w.-]/g,'_')}\`, file, { upsert: true })` | `accept="image/png,image/jpeg,image/webp,application/pdf"`. |
| Save | `from('user_driving_licenses').upsert({ user_id, dl_number: trim().toUpperCase(), issued_on, valid_upto, vehicle_classes, document_path }, { onConflict: 'user_id' })` → **"Driving licence saved"** | `issued_on`, `valid_upto` (dates) and `vehicle_classes` (text[]: MCWOG, MCWG, LMV, …) are optional; the app doesn't collect them yet (sent as `null` / `[]` would overwrite: **the app omits them**). |
| Validation | `"Enter the licence number"` if the number is empty; `"Upload a photo or PDF of your licence"` if there is no new file **and** no existing `document_path` | Both are required on the web: a number **and** a document. |
| OCR | `useServerFn(...)({ data: { image: dataUrl } })` → `{ dl_number, issued_on, valid_upto, vehicle_classes }` | **Web-internal `/_serverFn/` call: never used by the app.** See "OCR" below. |
| Who is prompted | `roles.includes('user') && !roles.includes('superadmin')` and no DL row | Dashboard prompt with **Skip**: `localStorage['dl-skipped:<uid>'] = '1'`. The app mirrors it with `onboarding-dl-skipped:<uid>` (Part B). |

## OCR / public endpoints (probed 2026-11-23, empty body, no auth, nothing processed)

| Endpoint | Live answer | Meaning |
|---|---|---|
| `POST APP/ocr/driving-license` | `401 {"error":{"code":"unauthorized"}}` | **Exists** (an unknown route answers `404 not_found`). Bearer required. |
| `POST APP/ocr/rc`, `APP/ocr/document` | `401` | Exist. |
| `POST APP/vehicles/lookup` | `400 {"error":{"message":"Required"}}` | Exists, no auth. |

The phase 1 brief says OCR has no public endpoint, so `ocrService.readDl()` returns `unavailable` as
instructed and the user types the number. **Open question O1** (API_PLAN §9): the public routes exist;
confirm the response shape / cost / consent and we wire them behind the same interface.
