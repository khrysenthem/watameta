import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { upsertUserByEmail } from "@/db/users";
import { issueSessionToken } from "@/session-token";

/**
 * Verifies a Google ID token the mobile app obtained on-device (via
 * react-native-app-auth/AppAuth — Google's iOS OAuth client type steers
 * generic browser-based flows away, see mobile/README.md) and, if valid,
 * upserts the user and returns a session token for
 * `Authorization: Bearer <token>` on every other API call.
 *
 * No code-for-token exchange happens here — AppAuth already did that
 * on-device. That's not a security downgrade: this client type gets no
 * secret from Google either way (PKCE alone secures it), so there's nothing
 * a server-side exchange would have protected that verifying the resulting
 * ID token's signature here doesn't already cover.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const idToken =
    body && typeof body === "object" && "idToken" in body && typeof body.idToken === "string"
      ? body.idToken
      : null;

  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  const clientId = process.env.AUTH_GOOGLE_MOBILE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 500 });
  }

  const client = new OAuth2Client({ clientId });

  let email: string | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    email = ticket.getPayload()?.email;
  } catch {
    return NextResponse.json({ error: "Invalid Google ID token" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: "Google account has no email" }, { status: 401 });
  }

  const user = await upsertUserByEmail(email);
  const token = await issueSessionToken({ userId: user.id, email });

  return NextResponse.json({ token, user: { id: user.id, email } });
}
