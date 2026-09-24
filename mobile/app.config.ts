import type { ExpoConfig } from "expo/config";

const BUNDLE_ID = "dev.watameta.mobile";

// The app's custom URL scheme *must* be Google's derived reversed-client-id
// value — its iOS OAuth client type has no configurable redirect URI list,
// unlike "Web application" clients (see mobile/README.md). Falls back to the
// bundle id so the app still builds before EXPO_PUBLIC_GOOGLE_CLIENT_ID is
// set; Google sign-in just won't work until it is.
//
// Inlined rather than imported from src/lib/google-client.ts (which has the
// same logic, used at runtime by the JS bundle): Expo's config loader
// transpiles this file standalone and can't resolve a bare .ts import.
function reversedClientIdScheme(clientId: string): string | undefined {
  if (!clientId) return undefined;
  return clientId.split(".").reverse().join(".");
}

const scheme = reversedClientIdScheme(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "") ?? BUNDLE_ID;

const config: ExpoConfig = {
  name: "Watameta",
  slug: "watameta",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/images/icon.png",
  scheme,
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: BUNDLE_ID,
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-secure-store",
    [
      "react-native-app-auth",
      {
        // Google's docs explicitly steer iOS OAuth clients away from generic
        // browser-based flows (see mobile/README.md) — this plugin wires up
        // the same derived scheme for AppAuth's native redirect handling.
        ios: { urlScheme: scheme },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
