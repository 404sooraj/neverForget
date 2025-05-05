import {
  View,
  StyleSheet,
  Button,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { Audio } from "expo-av";
import { useState } from "react";
import { RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from "@/modules/audio";
import { useAuth } from "../auth/AuthContext";
import { router } from "expo-router";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const { username, signOut } = useAuth();

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert("Permission to access microphone is required!");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await recording.startAsync();
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      const status = await recording.getStatusAsync();

      if (!status.isRecording) {
        console.warn("Recording already stopped");
        return;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log("Recording stored at:", uri);
      setRecording(null);

      if (uri && username) {
        const formData = new FormData();
        formData.append("audio", {
          uri,
          name: "audio.m4a",
          type: Platform.OS === "ios" ? "audio/x-m4a" : "audio/m4a",
        } as any);
        formData.append("username", username);

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/transcribe`,
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();
        console.log("Upload result:", result);
      }
    } catch (err) {
      console.error("Failed to stop or upload recording", err);
    }
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {username}!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.recordButton, recording && styles.recordingButton]}
        onPress={recording ? stopRecording : startRecording}
      >
        <Text style={styles.recordButtonText}>
          {recording ? "Stop Recording" : "Start Recording"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: "#ff3b30",
    fontSize: 16,
  },
  recordButton: {
    backgroundColor: "#007AFF",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: "auto",
  },
  recordingButton: {
    backgroundColor: "#ff3b30",
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
