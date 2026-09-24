import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import type { TodayHour } from "@/lib/api-client";
import { useThemeColors } from "@/lib/theme";

const CHART_HEIGHT = 140;
const LABEL_HOURS = [0, 4, 8, 12, 16, 20];

export function HourlyBarChart({ hours, date }: { hours: TodayHour[]; date: string }) {
  // "actual" and "forecast" are the same metric at different certainty, not
  // two series, so they're the same hue at two lightness steps (c.series /
  // c.seriesForecast) rather than two colors.
  const c = useThemeColors();
  const [showTable, setShowTable] = useState(false);
  // The window width isn't the plot's actual width — this card has its own
  // padding, and sits inside a scroll container with its own (safe-area
  // dependent, so orientation-dependent) padding too. Measuring the plot
  // row's own laid-out width — it already stretches to fill its parent's
  // content box — is what keeps bars from overflowing that box, in any
  // orientation, without having to track every surrounding padding value.
  const [plotWidth, setPlotWidth] = useState(0);
  const onPlotLayout = (e: LayoutChangeEvent) => setPlotWidth(e.nativeEvent.layout.width);

  const values = hours.map((h) => h.value).filter((v): v is number => v !== null);
  const hasData = values.length > 0;
  const minValue = hasData ? Math.min(...values) : 0;
  const maxValue = hasData ? Math.max(...values) : 1;
  const range = maxValue - minValue || 1;

  const slotWidth = plotWidth / 24;
  const barWidth = Math.max(slotWidth * 0.55, 3);

  const lastIndexWithValue = [...hours].reverse().findIndex((h) => h.value !== null);
  const finalIndex = lastIndexWithValue === -1 ? -1 : hours.length - 1 - lastIndexWithValue;

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <Text style={[styles.date, { color: c.textPrimary }]}>{date}</Text>

      <View style={[styles.plot, { height: CHART_HEIGHT }]} onLayout={onPlotLayout}>
        {hours.map((h, i) => {
          const barHeight =
            h.value === null ? 2 : Math.max(((h.value - minValue) / range) * (CHART_HEIGHT - 24) + 4, 4);
          const color = h.value === null ? c.axis : h.source === "forecast" ? c.seriesForecast : c.series;

          return (
            <View key={h.hour} style={{ width: slotWidth, height: CHART_HEIGHT, ...styles.slot }}>
              {i === finalIndex && h.value !== null ? (
                <Text style={[styles.endLabel, { color: c.textSecondary }]} numberOfLines={1}>
                  {h.value}
                </Text>
              ) : null}
              <View style={{ width: barWidth, height: barHeight, backgroundColor: color, ...styles.bar }} />
            </View>
          );
        })}
      </View>

      <View style={styles.axisRow}>
        {hours.map((h) => (
          <View key={h.hour} style={{ width: slotWidth, alignItems: "center" }}>
            {LABEL_HOURS.includes(h.hour) ? (
              <Text style={[styles.axisLabel, { color: c.muted }]}>{h.hour}</Text>
            ) : null}
          </View>
        ))}
      </View>

      <Text style={[styles.caption, { color: c.textSecondary }]}>Darker = recorded · Lighter = forecast</Text>

      <Pressable onPress={() => setShowTable((s) => !s)} hitSlop={8}>
        <Text style={[styles.toggle, { color: c.series }]}>{showTable ? "Hide table" : "Show table"}</Text>
      </Pressable>

      {showTable ? (
        <View style={styles.table}>
          {hours.map((h) => (
            <View key={h.hour} style={[styles.tableRow, { borderColor: c.axis }]}>
              <Text style={{ color: c.textSecondary, width: 50 }}>{String(h.hour).padStart(2, "0")}:00</Text>
              <Text style={{ color: c.textPrimary, flex: 1, textAlign: "right" }}>{h.value ?? "—"}</Text>
              <Text style={{ color: c.muted, width: 70, textAlign: "right" }}>{h.source ?? ""}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 8, padding: 16 },
  date: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  plot: { flexDirection: "row", alignItems: "flex-end" },
  slot: { alignItems: "center", justifyContent: "flex-end" },
  bar: { borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  endLabel: { fontSize: 10, marginBottom: 2 },
  axisRow: { flexDirection: "row" },
  axisLabel: { fontSize: 10, marginTop: 4 },
  caption: { fontSize: 12, marginTop: 12, textAlign: "center" },
  toggle: { fontSize: 14, marginTop: 12, textAlign: "center", fontWeight: "600" },
  table: { marginTop: 12 },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth },
});
