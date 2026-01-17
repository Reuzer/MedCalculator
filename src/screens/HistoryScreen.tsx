// src/screens/HistoryScreen.tsx
import React, { useCallback, useRef, useState } from "react";
import { Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../auth/AuthContext";
import { deletePregnancyHistory, fetchPregnancyHistory, PregnancyHistoryRow } from "../services/pregnancyHistory";
import { loadLocalHistory, LocalHistoryItem, removeLocalHistory } from "../storage/localHistory";
import { requestHistorySync } from "../services/sync";

type UiItem =
  | ({ kind: "cloud" } & PregnancyHistoryRow)
  | ({ kind: "local" } & LocalHistoryItem);

export function HistoryScreen() {
  const { user } = useAuth();

  const [cloudItems, setCloudItems] = useState<PregnancyHistoryRow[]>([]);
  const [localItems, setLocalItems] = useState<LocalHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;

    setLoading(true);
    try {
      // 1) мгновенно показываем локальные
      const local = await loadLocalHistory();
      setLocalItems(local);

      // 2) если есть user — запускаем синк, но НЕ ждём
      if (user) {
        if (local.length > 0) {
          requestHistorySync(user.id).catch(() => {});
        }

        // 3) грузим облако (не зависит от синка)
        const cloud = await fetchPregnancyHistory();
        setCloudItems(cloud);
      } else {
        setCloudItems([]);
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить историю");
    } finally {
      setLoading(false);
      refreshInFlight.current = false;
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const data: UiItem[] = user
    ? [
        ...localItems.map((x) => ({ kind: "local" as const, ...x })),
        ...cloudItems.map((x) => ({ kind: "cloud" as const, ...x })),
      ]
    : localItems.map((x) => ({ kind: "local" as const, ...x }));

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button title={loading ? "..." : "Обновить"} onPress={refresh} disabled={loading} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(x) => (x.kind === "local" ? `local:${x.client_id}` : `cloud:${x.id}`)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>История пуста.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>
              {new Date(item.kind === "local" ? item.created_at : item.created_at).toLocaleString("ru-RU")}{" "}
              {item.kind === "local" ? "(локально)" : "(в облаке)"}
            </Text>

            <Text style={styles.line}>ПМ: {item.lmp_date}</Text>
            <Text style={styles.line}>Цикл: {item.cycle_length} дней</Text>
            <Text style={styles.line}>
              Срок: {item.weeks} нед. {item.days} дн. (триместр {item.trimester})
            </Text>
            <Text style={styles.line}>ПДР: {item.edd_date}</Text>

            <Text style={[styles.line, { marginTop: 8, fontWeight: "700" }]}>Рекомендации:</Text>
            <Text style={styles.reco}>{item.recommendation_text ?? "—"}</Text>

            <View style={{ marginTop: 10 }}>
              <Button
                title={loading ? "..." : "Удалить"}
                color="#b00020"
                disabled={loading}
                onPress={() => {
                  Alert.alert("Удалить запись?", "", [
                    { text: "Отмена", style: "cancel" },
                    {
                      text: "Удалить",
                      style: "destructive",
                      onPress: async () => {
                        setLoading(true);
                        try {
                          if (item.kind === "local") {
                            await removeLocalHistory(item.client_id);
                            // если залогинен — синк сам дойдет по очереди
                            if (user) requestHistorySync(user.id).catch(() => {});
                          } else {
                            await deletePregnancyHistory(item.id);
                          }
                          await refresh();
                        } catch (e: any) {
                          Alert.alert("Ошибка", e?.message ?? "Не удалось удалить");
                        } finally {
                          setLoading(false);
                        }
                      },
                    },
                  ]);
                }}
              />
            </View>
          </View>
        )}
      />

      {!user && (
        <Text style={styles.hint}>
          Сейчас показывается локальная история. После входа она автоматически синхронизируется с Supabase.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  empty: { color: "#666", marginTop: 12 },
  card: { borderWidth: 1, borderColor: "#e6e6e6", borderRadius: 14, padding: 14, marginTop: 12 },
  title: { fontWeight: "700", marginBottom: 6 },
  line: { color: "#222", marginTop: 2 },
  reco: { color: "#222", lineHeight: 20, marginTop: 4 },
  hint: { color: "#666", fontSize: 12, marginTop: 8 },
});
