import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "local_pregnancy_history_v1";

export type LocalHistoryItem = {
  client_id: string; // локальный уникальный id (для дедупликации при sync)
  created_at: string; // ISO datetime

  lmp_date: string; // YYYY-MM-DD
  cycle_length: number;

  gest_age_days: number;
  weeks: number;
  days: number;
  trimester: number;

  edd_date: string; // YYYY-MM-DD
  recommendation_text: string | null;
};

export async function loadLocalHistory(): Promise<LocalHistoryItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveLocalHistory(items: LocalHistoryItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function addLocalHistory(item: LocalHistoryItem) {
  const items = await loadLocalHistory();
  await saveLocalHistory([item, ...items]);
}

export async function clearLocalHistory() {
  await AsyncStorage.removeItem(KEY);
}

export async function removeLocalHistory(client_id: string) {
  const items = await loadLocalHistory();
  await saveLocalHistory(items.filter((x) => x.client_id !== client_id));
}
