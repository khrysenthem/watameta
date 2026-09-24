/**
 * Google's iOS OAuth client type has no configurable "authorized redirect
 * URIs" list — unlike its "Web application" client type, the only redirect
 * scheme it will accept is this derived one (the actual value straight out
 * of the downloaded GoogleService-Info.plist's REVERSED_CLIENT_ID field, for
 * a client id like "587...bb.apps.googleusercontent.com").
 */
export function reversedClientIdScheme(clientId: string): string | undefined {
  if (!clientId) return undefined;
  return clientId.split(".").reverse().join(".");
}
