// client/app/_layout.tsx
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";

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
    return <View />; // Or a loading spinner
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
