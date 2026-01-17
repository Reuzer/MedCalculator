import React, { useMemo, useState } from "react";
import { Alert, Button, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { calculatePregnancyFromLMP, formatDateRU, toISODateOnly } from "../utils/pregnancy";
import { fetchAiRecommendation } from "../services/ai";
import { useAuth } from "../auth/AuthContext";
import { addLocalHistory } from "../storage/localHistory";
import { requestHistorySync } from "../services/sync";

function makeClientId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function CalculatorScreen() {
  const { user } = useAuth();

  const [lmpDate, setLmpDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [cycleLength, setCycleLength] = useState<string>("28");

  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const cycleLenNumber = useMemo(() => {
    const n = Number(cycleLength);
    if (!Number.isFinite(n)) return 28;
    return Math.min(45, Math.max(20, Math.round(n)));
  }, [cycleLength]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Калькулятор срока и ПДР</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Дата последней менструации (ПМ)</Text>
        <Text style={styles.value}>{lmpDate.toLocaleDateString("ru-RU")}</Text>
        <Button title="Выбрать дату" onPress={() => setShowPicker(true)} />

        {showPicker && (
          <DateTimePicker
            value={lmpDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, date) => {
              setShowPicker(false);
              if (date) setLmpDate(date);
            }}
            maximumDate={new Date()}
          />
        )}

        <Text style={[styles.label, { marginTop: 12 }]}>Длина цикла (дней)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={cycleLength}
          onChangeText={setCycleLength}
          placeholder="28"
        />

        <View style={{ marginTop: 12 }}>
          <Button
            title={loading ? "Считаем..." : "Рассчитать"}
            onPress={async () => {
              const clientId = makeClientId();

              try {
                setLoading(true);
                setRecommendation(null);
                setResultText(null);

                const result = calculatePregnancyFromLMP({
                  lmp: lmpDate,
                  cycleLength: cycleLenNumber,
                });

                const lmpISO = toISODateOnly(lmpDate);
                const eddHuman = formatDateRU(result.eddISO);

                setResultText(
                  `Срок: ${result.weeks} нед. ${result.days} дн.\nТриместр: ${result.trimester}\nПДР: ${eddHuman}`
                );

                const ai = await fetchAiRecommendation({
                  weeks: result.weeks,
                  days: result.days,
                  trimester: result.trimester,
                  eddISO: result.eddISO,
                });
                setRecommendation(ai.recommendationText);

                // 1) Всегда сохраняем локально
                await addLocalHistory({
                  client_id: clientId,
                  created_at: new Date().toISOString(),
                  lmp_date: lmpISO,
                  cycle_length: cycleLenNumber,
                  gest_age_days: result.gestAgeDays,
                  weeks: result.weeks,
                  days: result.days,
                  trimester: result.trimester,
                  edd_date: result.eddISO,
                  recommendation_text: ai.recommendationText,
                });

                // 2) Если есть user — сразу upsert в Supabase (локальное потом синк очистит)
                if (user) {
                  requestHistorySync(user.id).catch(() => {});
                }
              } catch (e: any) {
                Alert.alert("Ошибка", e?.message ?? "Не удалось выполнить расчёт");
              } finally {
                setLoading(false);
              }
            }}
          />
        </View>

        {!user && (
          <Text style={styles.hint}>
            Сейчас история сохраняется локально. После входа на вкладке “Аккаунт” она синхронизируется с Supabase.
          </Text>
        )}
      </View>

      {resultText && (
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Результат</Text>
          <Text style={styles.mono}>{resultText}</Text>

          <Text style={[styles.blockTitle, { marginTop: 12 }]}>Рекомендации</Text>
          <Text style={styles.reco}>
            {recommendation ?? (loading ? "Загружаем..." : "—")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#e6e6e6", borderRadius: 14, padding: 14, gap: 8 },
  label: { color: "#555" },
  value: { fontSize: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  blockTitle: { fontWeight: "700" },
  mono: { lineHeight: 20 },
  reco: { lineHeight: 20, color: "#222" },
  hint: { color: "#666", fontSize: 12, marginTop: 8 },
});
