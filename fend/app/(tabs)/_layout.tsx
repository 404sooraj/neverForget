import React from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "react-native";
import theme from "@/services/theme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  // Use theme colors instead of hardcoded values
  const activeColor = isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600];
  const inactiveColor = isDarkMode ? theme.colors.neutral[500] : theme.colors.secondary[400];
  const bgColor = isDarkMode ? theme.colors.secondary[900] : theme.colors.white;
  const borderColor = isDarkMode ? theme.colors.secondary[800] : theme.colors.secondary[200];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          paddingVertical: 6,
          height: theme.layout.bottomTabHeight,
          ...theme.shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: '600', // semibold
          marginBottom: 3,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: "Memories",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "book" : "book-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: "Ask AI",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
              size={22}
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
              name={focused ? "person" : "person-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
