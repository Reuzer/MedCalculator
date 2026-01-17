// src/services/sync.ts
import { supabase } from "../lib/supabase";
import { clearLocalHistory, loadLocalHistory } from "../storage/localHistory";

let inFlight: Promise<{ synced: number }> | null = null;
let pending = false;
let lastUserId: string | null = null;

async function syncOnce(userId: string) {
  const local = await loadLocalHistory();
  if (local.length === 0) return { synced: 0 };

  const payload = local.map((x) => ({
    user_id: userId,
    client_id: x.client_id,
    lmp_date: x.lmp_date,
    cycle_length: x.cycle_length,
    gest_age_days: x.gest_age_days,
    weeks: x.weeks,
    days: x.days,
    trimester: x.trimester,
    edd_date: x.edd_date,
    recommendation_text: x.recommendation_text,
  }));

  const { error } = await supabase
    .from("pregnancy_history")
    .upsert(payload, { onConflict: "user_id,client_id" });

  if (error) throw error;

  await clearLocalHistory();
  return { synced: local.length };
}

// Можно вызывать много раз — реально выполнится последовательно и без параллельных запросов
export function requestHistorySync(userId: string) {
  lastUserId = userId;
  pending = true;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    let total = 0;

    while (pending) {
      pending = false;
      if (!lastUserId) break;
      const res = await syncOnce(lastUserId);
      total += res.synced;
    }

    return { synced: total };
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
