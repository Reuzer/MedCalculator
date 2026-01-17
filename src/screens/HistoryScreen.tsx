import React, { useCallback, useMemo, useState } from "react";
import { Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../auth/AuthContext";
import {
  deletePregnancyHistory,
  fetchPregnancyHistory,
  PregnancyHistoryRow,
} from "../services/pregnancyHistory";
import {
  loadLocalHistory,
  LocalHistoryItem,
  removeLocalHistory,
} from "../storage/localHistory";

type UiItem =
  | ({ kind: "cloud" } & PregnancyHistoryRow)
  | ({ kind: "local" } & LocalHistoryItem);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Небольшая минимальная задержка, чтобы исчезновение disabled-состояния не выглядело как "мигание"
async function withMinDelay<T>(promise: Promise<T>, minMs = 250): Promise<T> {
  const start = Date.now();
  try {
    return await promise;
  } finally {
    const dt = Date.now() - start;
    if (dt < minMs) await sleep(minMs - dt);
  }
}

export function HistoryScreen() {
  const { user } = useAuth();

  const [cloudItems, setCloudItems] = useState<PregnancyHistoryRow[]>([]);
  const [localItems, setLocalItems] = useState<LocalHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (refreshing || deletingKey) return;

    setRefreshing(true);
    try {
      await withMinDelay(
        (async () => {
          const local = await loadLocalHistory();
          setLocalItems(local);

          if (user) {
            const cloud = await fetchPregnancyHistory();
            setCloudItems(cloud);
          } else {
            setCloudItems([]);
          }
        })(),
        250
      );
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить историю");
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshing, deletingKey]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const data: UiItem[] = useMemo(() => {
    return user
      ? [
          ...localItems.map((x) => ({ kind: "local" as const, ...x })),
          ...cloudItems.map((x) => ({ kind: "cloud" as const, ...x })),
        ]
      : localItems.map((x) => ({ kind: "local" as const, ...x }));
  }, [user, localItems, cloudItems]);

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button
          title="Обновить"
          onPress={refresh}
          
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(x) =>
          x.kind === "local" ? `local:${x.client_id}` : `cloud:${x.id}`
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>История пуста.</Text>}
        renderItem={({ item }) => {
          const key = item.kind === "local" ? `local:${item.client_id}` : `cloud:${item.id}`;
          const isDeleting = deletingKey === key;

          return (
            <View style={styles.card}>
              <Text style={styles.title}>
                {new Date(item.created_at).toLocaleString("ru-RU")}{" "}
                {item.kind === "local" ? "(локально)" : "(в облаке)"}
              </Text>

              <Text style={styles.line}>ПМ: {item.lmp_date}</Text>
              <Text style={styles.line}>Цикл: {item.cycle_length} дней</Text>
              <Text style={styles.line}>
                Срок: {item.weeks} нед. {item.days} дн. (триместр {item.trimester})
              </Text>
              <Text style={styles.line}>ПДР: {item.edd_date}</Text>

              <Text style={[styles.line, { marginTop: 8, fontWeight: "700" }]}>
                Рекомендации:
              </Text>
              <Text style={styles.reco}>{item.recommendation_text ?? "—"}</Text>

              <View style={{ marginTop: 10 }}>
                <Button
                  title="Удалить"
                  color="#b00020"
                  onPress={() => {
                    Alert.alert("Удалить запись?", "", [
                      { text: "Отмена", style: "cancel" },
                      {
                        text: "Удалить",
                        style: "destructive",
                        onPress: async () => {
                          setDeletingKey(key);
                          try {
                            await withMinDelay(
                              (async () => {
                                if (item.kind === "local") {
                                  await removeLocalHistory(item.client_id);
                                } else {
                                  await deletePregnancyHistory(item.id);
                                }
                                await refresh();
                              })(),
                              250
                            );
                          } catch (e: any) {
                            Alert.alert("Ошибка", e?.message ?? "Не удалось удалить");
                          } finally {
                            setDeletingKey(null);
                          }
                        },
                      },
                    ]);
                  }}
                />
              </View>
            </View>
          );
        }}
      />

      {!user && (
        <Text style={styles.hint}>
          Сейчас показывается локальная история. После входа будет доступна облачная история.
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
