// Expo only inlines env vars prefixed EXPO_PUBLIC_ into the JS bundle — these
// are not secret, they're the same public client_id a browser-based OAuth
// flow would expose regardless.
// `||`, not `??`: an .env file with the key present but left blank (as the
// .env.example template ships it) sets an empty string, not undefined.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.142:3000";
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
