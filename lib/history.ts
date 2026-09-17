export type RequestRecord = {
  id: string;
  at: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
};

const KEY = "bggone:requests";

export function getHistory(): RequestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      window.sessionStorage.getItem(KEY) || window.sessionStorage.getItem("removebg:requests") || "[]",
    ) as RequestRecord[];
  } catch {
    return [];
  }
}

export function recordRequest(record: Omit<RequestRecord, "id" | "at">): void {
  if (typeof window === "undefined") return;
  const entries = [{ ...record, id: crypto.randomUUID(), at: new Date().toISOString() }, ...getHistory()].slice(0, 30);
  window.sessionStorage.setItem(KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("bggone:history"));
}
