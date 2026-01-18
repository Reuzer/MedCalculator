// src/screens/AuthScreen.tsx
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";

export function AuthScreen() {
  const { user, signIn, signUp, signOut } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loggedIn = !!user;

  return (
    <View style={styles.container}>

      <View style={styles.card}>
        <Text style={styles.label}>Статус:</Text>
        <Text style={styles.value}>{loggedIn ? user?.email ?? "Вы вошли" : "Вы не вошли"}</Text>
      </View>

      {!loggedIn ? (
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
          />

          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Пароль"
          />

          <View style={styles.row}>
            <Button
              title={loading ? "..." : "Войти"}
              disabled={loading}
              onPress={async () => {
                try {
                  setLoading(true);
                  await signIn(email.trim(), password);
                } catch (e: any) {
                  Alert.alert("Ошибка входа", e?.message ?? "Не удалось войти");
                } finally {
                  setLoading(false);
                }
              }}
            />
            <Button
              title={loading ? "..." : "Регистрация"}
              disabled={loading}
              onPress={async () => {
                try {
                  setLoading(true);
                  await signUp(email.trim(), password);
                  Alert.alert("Готово", "Если включено подтверждение email — проверь почту.");
                } catch (e: any) {
                  Alert.alert("Ошибка регистрации", e?.message ?? "Не удалось зарегистрироваться");
                } finally {
                  setLoading(false);
                }
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Button
            title={loading ? "Выходим..." : "Выйти"}
            color="#b00020"
            disabled={loading}
            onPress={async () => {
              try {
                setLoading(true);
                await signOut();
              } catch (e: any) {
                Alert.alert("Ошибка", e?.message ?? "Не удалось выйти");
              } finally {
                setLoading(false);
              }
            }}
          />
        </View>
      )}

      <Text style={styles.hint}>
        Синхронизация выполняется автоматически при входе и при изменениях истории.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#e6e6e6", borderRadius: 14, padding: 14, gap: 10 },
  label: { color: "#555" },
  value: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  hint: { color: "#666", fontSize: 12, marginTop: "auto" },
});
