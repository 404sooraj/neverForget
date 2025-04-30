// App.js or your component
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { BackendUrl } from "@/constants/contants";

export default function Recorder() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function startRecording() {
    try {
      setError("");
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Permission to access microphone is required!");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
    } catch (err) {
      setError("Failed to start recording. Please try again.");
      console.error("Failed to start recording:", err);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      setIsLoading(true);
      setRecording(null);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (!uri) {
        throw new Error("No recording URI found");
      }

      const formData = new FormData();
      const audioFile = {
        uri,
        name: "audio.m4a",
        type: "audio/x-m4a",
      } as any;

      formData.append("audio", audioFile);


      const response = await fetch(`${BackendUrl}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload audio");
      }

      const data = await response.json();
      setTranscript(data.transcript);
    } catch (err) {
      setError("Failed to process recording. Please try again.");
      console.error("Failed to process recording:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.recordButton, recording && styles.recordingButton]}
        onPress={recording ? stopRecording : startRecording}
        disabled={isLoading}
      >
        <MaterialIcons
          name={recording ? "stop" : "mic"}
          size={32}
          color="white"
        />
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing your recording...</Text>
        </View>
      )}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : transcript ? (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>Transcript:</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingButton: {
    backgroundColor: "#FF3B30",
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  transcriptContainer: {
    width: "100%",
    marginTop: 30,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  transcriptLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666",
  },
});
