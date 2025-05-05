import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops! Not Found" }} />
      <View style={styles.container}>
        <Link href="/(tabs)/home" style={styles.link}>
          <Text style={styles.linkText}>Go back to Home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25292e",
    justifyContent: "center",
    alignItems: "center",
  },
  link: {
    padding: 8,
  },
  linkText: {
    fontSize: 20,
    textDecorationLine: "underline",
    color: "#fff",
  },
});
