import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { fetchToday, type TodayResponse } from "@/lib/api-client";
import { HourlyBarChart } from "@/components/hourly-bar-chart";

export function TodayScreen() {
  const { token, user, signOut } = useAuth();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchToday(token)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load today's data");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Sign out" onPress={signOut} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {user ? <Text style={styles.subtitle}>{user.email}</Text> : null}
      {data ? <HourlyBarChart hours={data.hours} date={data.date} /> : null}
      <Button title="Sign out" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingTop: 60, paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  subtitle: { fontSize: 14, color: "#888" },
  error: { color: "#c0392b" },
});
