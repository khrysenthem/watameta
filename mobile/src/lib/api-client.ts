import { API_BASE_URL } from "./config";

export interface TodayHour {
  hour: number;
  value: number | null;
  source: "actual" | "forecast" | null;
}

export interface TodayResponse {
  date: string;
  hours: TodayHour[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function errorMessageFrom(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return `Request failed with status ${response.status}`;
}

export async function fetchToday(token: string): Promise<TodayResponse> {
  // Dev-only: pins "today" to a fixed instant, so testing against fixed seed
  // data doesn't always look entirely forecasted once enough real time has
  // passed since it was recorded. Unset in normal use.
  const debugNow = process.env.EXPO_PUBLIC_DEBUG_NOW;
  const url = debugNow
    ? `${API_BASE_URL}/api/today?now=${encodeURIComponent(debugNow)}`
    : `${API_BASE_URL}/api/today`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessageFrom(response));
  }

  return response.json();
}
