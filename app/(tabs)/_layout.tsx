import React from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="calculator"
        options={{ title: "Калькулятор", headerShown: true, tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? "calculator" : "calculator-outline"}
            size={size}
            color={color}
          />
        ) }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "История", headerShown: true,  tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? "time" : "time-outline"}
            size={size}
            color={color}
          />
        ), }}
      />
      <Tabs.Screen
        name="auth"
        options={{ title: "Аккаунт", headerShown: true, tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? "person-circle" : "person-circle-outline"}
            size={size}
            color={color}
          />
        ) }}
      />
    </Tabs>
  );
}
