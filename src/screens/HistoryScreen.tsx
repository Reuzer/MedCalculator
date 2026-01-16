import React, { useCallback, useState } from "react";
import { Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../auth/AuthContext";
import { deletePregnancyHistory, fetchPregnancyHistory, PregnancyHistoryRow } from "../services/pregnancyHistory";
import { loadLocalHistory, LocalHistoryItem, removeLocalHistory } from "../storage/localHistory";
import { syncLocalHistoryToSupabase } from "../services/sync";

type UiItem =
  | ({ kind: "cloud" } & PregnancyHistoryRow)
  | ({ kind: "local" } & LocalHistoryItem);

export function HistoryScreen() {
  const { user } = useAuth();

  const [cloudItems, setCloudItems] = useState<PregnancyHistoryRow[]>([]);
  const [localItems, setLocalItems] = useState<LocalHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const local = await loadLocalHistory();
      setLocalItems(local);

      if (user) {
        const cloud = await fetchPregnancyHistory();
        setCloudItems(cloud);
      } else {
        setCloudItems([]);
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить историю");
    } finally {
      setLoading(false);
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
        <Button title={loading ? "..." : "Обновить"} onPress={refresh} />
        {user && localItems.length > 0 && (
          <Button
            title="Синхронизировать"
            onPress={async () => {
              try {
                setLoading(true);
                const res = await syncLocalHistoryToSupabase(user.id);
                Alert.alert("Готово", `Синхронизировано: ${res.synced}`);
                await refresh();
              } catch (e: any) {
                Alert.alert("Ошибка синхронизации", e?.message ?? "Не удалось синхронизировать");
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
      </View>

      <FlatList
        data={data}
        keyExtractor={(x) => (x.kind === "local" ? `local:${x.client_id}` : `cloud:${x.id}`)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>История пуста.</Text>}
        renderItem={({ item }) => {
          const createdAt = item.kind === "local" ? item.created_at : item.created_at;

          return (
            <View style={styles.card}>
              <Text style={styles.title}>
                {new Date(createdAt).toLocaleString("ru-RU")}{" "}
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
                  title="Удалить"
                  color="#b00020"
                  onPress={() => {
                    Alert.alert("Удалить запись?", "", [
                      { text: "Отмена", style: "cancel" },
                      {
                        text: "Удалить",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            if (item.kind === "local") {
                              await removeLocalHistory(item.client_id);
                            } else {
                              await deletePregnancyHistory(item.id);
                            }
                            await refresh();
                          } catch (e: any) {
                            Alert.alert("Ошибка", e?.message ?? "Не удалось удалить");
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
          Сейчас показывается локальная история. После входа на вкладке “Аккаунт” она синхронизируется с Supabase.
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
