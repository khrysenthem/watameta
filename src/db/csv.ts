export function parseCsv(raw: string): { recordedAt: string; value: number }[] {
  const [, ...rows] = raw.trim().split("\n");
  return rows.map((line) => {
    const [time, value] = line.split(",");
    return { recordedAt: `${time}:00Z`, value: Number(value) };
  });
}
