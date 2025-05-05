// client/app/auth/index.tsx
import {
  View,
  StyleSheet,
  TextInput,
  Button,
  Text,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { router } from "expo-router";

export default function AuthScreen() {
  const [username, setUsername] = useState("");
  const [isSignIn, setIsSignIn] = useState(true);
  const [error, setError] = useState("");
  const { signIn, signUp } = useAuth();

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      setError("");
      if (isSignIn) {
        await signIn(username);
      } else {
        await signUp(username);
      }
      router.replace("/(tabs)/home");
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSignIn ? "Welcome Back!" : "Create Account"}
      </Text>
      <Text style={styles.subtitle}>
        {isSignIn
          ? "Sign in with your username"
          : "Sign up with a unique username"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>
          {isSignIn ? "Sign In" : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => setIsSignIn(!isSignIn)}
      >
        <Text style={styles.switchButtonText}>
          {isSignIn ? "Need to create an account?" : "Already have an account?"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  error: {
    color: "#ff3b30",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    padding: 8,
  },
  switchButtonText: {
    color: "#007AFF",
    textAlign: "center",
    fontSize: 14,
  },
});
