import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { fetchToday, type TodayResponse } from "@/lib/api-client";
import { getCachedToday, setCachedToday } from "@/lib/today-cache";
import { HourlyBarChart } from "@/components/hourly-bar-chart";

interface TodayState {
  data: TodayResponse;
  /** Set when `data` came from the on-device cache rather than a fresh fetch. */
  cachedAt: string | null;
}

export function TodayScreen() {
  const { token, user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  // Lazy initializer, not an effect: reading the cache is a synchronous,
  // one-time thing this component needs *as* its initial state, not a
  // side effect to synchronize afterwards.
  const [today, setToday] = useState<TodayState | null>(() => {
    const cached = getCachedToday();
    return cached ? { data: cached.data, cachedAt: cached.cachedAt } : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  useEffect(() => {
    if (!token) return;
    const hadCache = today !== null;

    fetchToday(token)
      .then((response) => {
        setToday({ data: response, cachedAt: null });
        setError(null);
        setCachedToday(response);
      })
      .catch((err: unknown) => {
        // A cached screen beats an error screen — only surface the error if
        // there was nothing at all to show.
        if (!hadCache) {
          setError(err instanceof Error ? err.message : "Failed to load today's data");
        }
      })
      .finally(() => setIsRefreshing(false));
    // today is read only to snapshot whether a cache existed at mount time,
    // not to react to its later updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const centerStyle = [
    styles.center,
    { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
  ];

  if (isRefreshing && !today) {
    return (
      <View style={centerStyle}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !today) {
    return (
      <View style={centerStyle}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Sign out" onPress={signOut} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      {user ? <Text style={styles.subtitle}>{user.email}</Text> : null}
      {today?.cachedAt ? (
        <Text style={styles.stale}>
          {isRefreshing ? "Refreshing…" : "Showing cached data"} · last updated{" "}
          {new Date(today.cachedAt).toLocaleString()}
        </Text>
      ) : null}
      {today ? <HourlyBarChart hours={today.data.hours} date={today.data.date} /> : null}
      <Button title="Sign out" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  subtitle: { fontSize: 14, color: "#888" },
  stale: { fontSize: 12, color: "#a06b00" },
  error: { color: "#c0392b" },
});
