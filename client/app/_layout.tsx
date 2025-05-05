// client/app/_layout.tsx
import React from "react";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Stack, useRouter } from "expo-router";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

function RootLayoutNav() {
  const { username, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!username) {
        router.replace("/auth");
      } else {
        router.replace("/(tabs)/home");
      }
    }
  }, [username, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
});
