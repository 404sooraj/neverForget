import { View, StyleSheet, Button, Platform } from "react-native";
import { Audio } from "expo-av";
import { useState } from "react";
import { RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from "@/modules/audio";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

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
  
      if (uri) {
        const formData = new FormData();
        formData.append("audio", {
          uri,
          name: "audio.m4a",
          type: Platform.OS === "ios" ? "audio/x-m4a" : "audio/m4a",
        } as any);
  
        const response = await fetch(
          "https://neverforget.onrender.com/transcribe",
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
  

  return (
    <View style={styles.container}>
      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
