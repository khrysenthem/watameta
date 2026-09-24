import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authorize } from "react-native-app-auth";
import { GOOGLE_CLIENT_ID } from "./config";
import { reversedClientIdScheme } from "./google-client";
import { exchangeGoogleIdToken } from "./mobile-auth";
import { clearStoredToken, getStoredToken, setStoredToken } from "./session-store";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    isSigningIn: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    getStoredToken().then((token) => {
      if (!cancelled) setState((s) => ({ ...s, token, isLoading: false }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = async () => {
    setState((s) => ({ ...s, isSigningIn: true, error: null }));

    try {
      // Google's docs explicitly steer iOS OAuth clients away from generic
      // browser-based flows and towards a library like this one (AppAuth) —
      // see mobile/README.md. AppAuth does the code-for-token exchange
      // on-device rather than handing us just a code, but that's not a
      // security downgrade here: this client type gets no secret from
      // Google either way (PKCE alone secures it), so there's nothing a
      // server-side exchange would have protected that this doesn't.
      const scheme = reversedClientIdScheme(GOOGLE_CLIENT_ID);
      const result = await authorize({
        issuer: "https://accounts.google.com",
        clientId: GOOGLE_CLIENT_ID,
        redirectUrl: `${scheme}:/oauth2redirect`,
        scopes: ["openid", "profile", "email"],
        usePKCE: true,
      });

      const session = await exchangeGoogleIdToken(result.idToken);

      await setStoredToken(session.token);
      setState((s) => ({ ...s, token: session.token, user: session.user, isSigningIn: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isSigningIn: false,
        error: err instanceof Error ? err.message : "Sign-in failed",
      }));
    }
  };

  const signOut = async () => {
    await clearStoredToken();
    setState((s) => ({ ...s, token: null, user: null }));
  };

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signInWithGoogle, signOut }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
