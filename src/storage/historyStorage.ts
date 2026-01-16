import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalcRecord } from "../types";

const KEY_HISTORY = "pdr_calc_history_v1";

export async function loadHistory(): Promise<CalcRecord[]> {
  const raw = await AsyncStorage.getItem(KEY_HISTORY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CalcRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(items: CalcRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(items));
}

export async function addToHistory(record: CalcRecord): Promise<void> {
  const items = await loadHistory();
  const next = [record, ...items];
  await saveHistory(next);
}

export async function removeFromHistory(id: string): Promise<void> {
  const items = await loadHistory();
  await saveHistory(items.filter((x) => x.id !== id));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY_HISTORY);
}
