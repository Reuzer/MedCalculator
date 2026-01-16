import { supabase } from "../lib/supabase";

export type PregnancyHistoryRow = {
  id: string;
  user_id: string;
  client_id: string;

  lmp_date: string;
  cycle_length: number;

  gest_age_days: number;
  weeks: number;
  days: number;
  trimester: number;

  edd_date: string;
  recommendation_text: string | null;
  created_at: string;
};

export type PregnancyHistoryUpsert = Omit<PregnancyHistoryRow, "id" | "created_at">;

export async function upsertPregnancyHistory(input: PregnancyHistoryUpsert) {
  const { data, error } = await supabase
    .from("pregnancy_history")
    .upsert(input, { onConflict: "user_id,client_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as PregnancyHistoryRow;
}

export async function fetchPregnancyHistory() {
  const { data, error } = await supabase
    .from("pregnancy_history")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PregnancyHistoryRow[];
}

export async function deletePregnancyHistory(id: string) {
  const { error } = await supabase.from("pregnancy_history").delete().eq("id", id);
  if (error) throw error;
}
