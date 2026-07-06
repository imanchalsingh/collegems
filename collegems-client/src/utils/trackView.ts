import api from "../api/axios";

const VIEWED_KEY = "tracked_entities";

function getViewedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(VIEWED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markViewed(key: string) {
  const set = getViewedSet();
  set.add(key);
  sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...set]));
}

export async function trackView(entityType: "Student" | "Course" | "Department", entityId: string) {
  const key = `${entityType}:${entityId}`;
  if (getViewedSet().has(key)) return;
  markViewed(key);
  try {
    const res = await api.post("/tracking/view", { entityType, entityId });
    console.log(`[trackView] Recorded: ${key} →`, res.data);
  } catch (err) {
    console.warn(`[trackView] Failed: ${key}`, err);
  }
}
