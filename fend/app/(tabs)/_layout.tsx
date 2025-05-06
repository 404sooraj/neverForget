import React from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = colorScheme === "dark" ? "#fff" : "#1e40af"; // Tailwind's blue-800
  const inactiveColor = "#94a3b8"; // Tailwind's slate-400

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#0f172a" : "#f8fafc", // Tailwind slate-900 / slate-50
          borderTopColor: "#e2e8f0", // Tailwind slate-200
          paddingVertical: 6,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home-sharp" : "home-outline"}
              color={color}
              size={26}
              style={{ marginBottom: -4 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: "Summary",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "book-sharp" : "book-outline"}
              color={color}
              size={26}
              style={{ marginBottom: -4 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: "Memory AI",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubble-sharp" : "chatbubble-outline"}
              color={color}
              size={26}
              style={{ marginBottom: -4 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-sharp" : "person-outline"}
              color={color}
              size={26}
              style={{ marginBottom: -4 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
