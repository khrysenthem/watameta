# Watameta — mobile

Expo (React Native) app for iOS/Android: sign in with Google, then view
today's water usage (actual readings so far + forecasted rest-of-day) from
the API's `GET /api/today`.

## Why a Development Build, not Expo Go

Google's OAuth flow needs a native redirect handled by `react-native-app-auth`
(AppAuth), a native module — Expo Go only includes its own bundled native
modules, so anything else needs a Development Build. Everything else in the
app runs fine in Expo Go; only the Google sign-in button needs the dev build.

```
npx expo run:ios       # requires Xcode + CocoaPods, builds and launches the Simulator
npx expo run:android   # requires Android Studio/SDK (not needed for iOS above)
```

## Setting up Google sign-in

This needs its **own** Google OAuth client, separate from the web app's —
Google's iOS/Android client types don't get a client secret at all ("not
applicable" per Google's docs; PKCE is what secures the flow instead), and
(this took two failed attempts to learn) Google's OAuth 2.0 policy actively
rejects generic/hand-rolled browser-based flows for these client types —
their own docs say to use a library like Google Sign-In or **AppAuth**
instead, which is why this app uses `react-native-app-auth` rather than a
plain `expo-auth-session` flow. In Google Cloud Console → APIs & Services →
Credentials:

1. Create an OAuth client of type **iOS**, Bundle ID `dev.watameta.mobile`
   (matches `app.config.ts`'s `ios.bundleIdentifier`). Download the
   generated plist if you want it for reference — nothing in this repo
   reads the file itself, we only need the values inside it.
2. There's no redirect URI to register — Google's iOS client type has no
   configurable list. The one scheme it will ever accept is derived
   automatically from the client id (its "reversed" form — the plist's
   `REVERSED_CLIENT_ID`, e.g. `com.googleusercontent.apps.<numbers>`).
   `app.config.ts` (the app's native URL scheme, baked in at build time,
   also passed to the `react-native-app-auth` config plugin) and
   `src/lib/auth-context.tsx` (the redirect URL used at runtime) both derive
   it the same way from the same client id, so there's nothing to keep in
   sync by hand.
3. Put that client's ID in **two** places:
   - The API's `.env`: `AUTH_GOOGLE_MOBILE_CLIENT_ID=...`
   - This app's `.env`: `EXPO_PUBLIC_GOOGLE_CLIENT_ID=...` (public by
     definition — Expo inlines `EXPO_PUBLIC_*` vars into the JS bundle, same
     as any browser-based OAuth client_id; no secret is ever involved here)
4. Rebuild the dev client (`npx expo run:ios`) — the native scheme is baked
   in at build time, so a plain `expo start` reload isn't enough after
   changing `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.

Also configurable, in this app's `.env`: `EXPO_PUBLIC_API_BASE_URL` — where
the API is reachable. Defaults to a hardcoded LAN IP in `src/lib/config.ts`;
override it if that doesn't match your machine
(`ipconfig getifaddr en0` on macOS) — needed for a physical device, and for
the Simulator if it can't reach `localhost`.

## How Google sign-in works here

1. The app runs a PKCE authorization-code flow against Google via
   `react-native-app-auth`'s `authorize()`, which handles the native
   redirect *and* the code-for-token exchange on-device, returning an ID
   token directly (no client secret is involved at any point — this client
   type doesn't have one).
2. The app POSTs `{ idToken }` to the API's `POST /api/mobile/auth/google`.
3. The API verifies that token's signature against Google's public keys
   (`google-auth-library`), upserts the user, and returns a session token.
4. The app stores that token in `expo-secure-store` and sends it as
   `Authorization: Bearer <token>` on every other request. The API's
   existing routes accept this token exactly like a web session cookie
   (`src/resolve-session-user.ts` at the repo root checks both).

Adding another provider later (Apple, etc.) means a sibling
`POST /api/mobile/auth/<provider>` reusing the same `upsertUserByEmail`/
`issueSessionToken` helpers — not a rewrite of this one.

## What's verified vs. not

Type-checked and linted; `expo config` confirms the native scheme resolves
to exactly Google's expected `REVERSED_CLIENT_ID`. The API-side pieces
(session token issuance/verification, the `/api/mobile/auth/google` bridge,
Bearer-token auth on the existing routes) are covered by the main repo's
test suite, and the app has been built and launched in the iOS Simulator.
The Google sign-in button itself has been exercised for real and reached
Google's server (ruling out anything malformed in our request — verified by
logging the full authorization URL) but hasn't completed a full successful
round-trip yet.
