import { API_BASE_URL } from "./config";

export interface MobileSession {
  token: string;
  user: { id: string; email: string };
}

/**
 * Sends the Google ID token our on-device AppAuth flow obtained to our own
 * backend, which verifies it against Google's public keys, upserts the
 * user, and returns our own session token.
 */
export async function exchangeGoogleIdToken(idToken: string): Promise<MobileSession> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Sign-in failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
