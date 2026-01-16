import React from "react";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="calculator"
        options={{ title: "Калькулятор", headerShown: true }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "История", headerShown: true }}
      />
      <Tabs.Screen
        name="auth"
        options={{ title: "Аккаунт", headerShown: true }}
      />
    </Tabs>
  );
}
