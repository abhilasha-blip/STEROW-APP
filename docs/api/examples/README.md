# Live API examples (redacted)

Captured with `scripts/smoke-auth.ts` against the public API (`APP_API_BASE_URL` from `.env.development`)
using the backend's fixed test login (phone 9999999999, no real SMS). Tokens, OTPs and hashes are
replaced with `<redacted …>`; phone numbers are masked. These files seed the msw fixtures in tests.

| File | Call | Result |
|---|---|---|
| `otp-request.signin.response.json` | `POST APP/auth/otp/request {phone:"<10 digits>", purpose:"signin"}` | `200 {data:{requestId, isNewUser}}` |
| `otp-request.signin.last-error.json` | same, within 30 s | `400 {error:{code:"bad_request", message:"Please wait 30 seconds before requesting another OTP."}}` |
| `otp-verify.signin.response.json` | `POST APP/auth/otp/verify {requestId, otp, purpose:"signin"}` | `200 {data:{access_token, refresh_token, expires_in:3600, token_type, user}}`: **a full session, no tokenHash** |
| `session.from-verify.json` | `supabase.auth.setSession(tokens)` | Supabase `Session` |
| `auth-user.json` | `supabase.auth.getUser()` | `user.phone` is `""`; phone + full_name live in `user_metadata` |
| `user_details.json` | `from('user_details').select('*').eq('id', uid)` | 1 row; **key column is `id` (= auth uid), there is no `user_id`** |
| `user_roles.json` | `from('user_roles').select('roles(name)').eq('user_id', uid)` | `[{roles:{name:"user"}}]` |
| `my_permissions.json` | `rpc('my_permissions')` | `[{menu_id, can_view, can_create, can_edit, can_delete}]` (truncated to 3) |

Also seen live: `"OTP expired. Request a new one."` (400) when verifying a ~15 h old request.
