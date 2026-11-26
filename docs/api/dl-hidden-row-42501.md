# Backend bug: a removed driving licence can never be saved again (42501 "Hide deleted rows")

> 2026-11-26 · For the backend team. Tracked in the app as **API_PLAN §9.6 O6**. Nothing in the app
> works around it: it shows a message and lets the user skip.

## What happens

`user_driving_licenses` keeps **one row per user** (unique `user_id`). "Delete" is a soft delete
(`is_active = false`, `deleted_at` set). After that:

1. The RLS policy **`Hide deleted rows`** hides the row from its owner. The app's
   `GET /rest/v1/user_driving_licenses?select=*&user_id=eq.<uid>` returns `[]`, so the app correctly
   offers an upload ("no licence yet").
2. The save is an upsert on `user_id`. The hidden row still holds that `user_id`, so the upsert
   resolves to an **UPDATE of the hidden row**, and the policy refuses it:

```http
POST /rest/v1/user_driving_licenses?on_conflict=user_id&select=*
Authorization: Bearer <user access token>
Prefer: resolution=merge-duplicates,return=representation
Content-Type: application/json

{ "user_id": "<uid>", "dl_number": "TS0120110012345", "document_path": "<uid>/1795…-dl.jpg",
  "issued_on": "2020-01-15", "valid_upto": "2040-01-14" }
```

```http
HTTP/1.1 403 Forbidden

{ "code": "42501", "details": null, "hint": null,
  "message": "new row violates row-level security policy \"Hide deleted rows\" for table \"user_driving_licenses\"" }
```

A plain insert fails the same way, with `23505 duplicate key value violates unique constraint
"user_driving_licenses_user_id_key"`. The web's form sends the same upsert
(`upsert(row, { onConflict: 'user_id' })`), so **the web is affected too**: any user who removes their
licence can never add one again.

## Who is affected now

- Every user whose licence row was soft-deleted.
- **The QA test account (mobile 9999999999)**: its row was soft-deleted by
  `scripts/reset-test-account.ts --include-dl`, so onboarding 2/3 can't save a licence on demo. An
  orphan file from the refused save is also left in `driving-licenses/<uid>/`.

## Proposed fix (either one)

| Option | Change | Notes |
|---|---|---|
| **A. Hard-delete** | Deleting a licence removes the row (and its file). | Simplest. The unique `user_id` is free again, so the existing upsert works. Lose the deleted row's history. |
| **B. Upsert restores the user's own row** | Let the owner's upsert revive their soft-deleted row: e.g. a `BEFORE UPDATE` trigger (or an RPC `save_my_driving_license(...)`) that sets `is_active = true, deleted_at = null, deleted_by = null` when `user_id = auth.uid()`, plus an UPDATE policy whose `USING` allows the owner's own deleted row (`user_id = auth.uid()`), keeping `Hide deleted rows` for SELECT. | Keeps the history; no app change needed (the request stays the same). |

Either way, a partial unique index (`unique (user_id) where deleted_at is null`) would also work, but
then the app's `on_conflict=user_id` must target that index, so A or B is less churn.

**And please restore (or hard-delete) the DL row of the test account 9999999999** so QA can run 2/3 on
demo again.

## What the app does (no workaround)

- `toUserError(error, 'dlSave')` maps a `42501` on the licence save, the `"Hide deleted rows"` text,
  or the `user_driving_licenses_user_id_key` duplicate to the existing message *"Your earlier licence
  was removed and can't be replaced yet. Please contact support."* with the action `DL_DELETED_BLOCKED`
  (`src/api/errorMessages.ts`).
- Onboarding 2/3 and My Profile → Driving Licence show it as an **inline card with "Skip for now"**, so
  onboarding is never blocked (`src/components/documents/BlockingNotice.tsx`).
- No retry: mutations never retry (`queryClient`: `mutations.retry = 0`), and the card doesn't resubmit.
  No elevated / service key is used; the app only ever sends the user's own token.
- Tests: `src/navigation/__tests__/documentLocks.test.tsx` ("licence save refused"),
  `src/api/__tests__/errorMessages.test.ts`.

When the backend fix ships, nothing changes in the app: the same upsert succeeds and the card never shows.
