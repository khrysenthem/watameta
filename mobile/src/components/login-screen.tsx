import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";

export function LoginScreen() {
  const { signInWithGoogle, isSigningIn, error } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Watameta</Text>
      <Text style={styles.subtitle}>Track your water usage</Text>
      <Button
        title={isSigningIn ? "Signing in…" : "Sign in with Google"}
        onPress={signInWithGoogle}
        disabled={isSigningIn}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24 },
  error: { color: "#c0392b", marginTop: 12, textAlign: "center" },
});
