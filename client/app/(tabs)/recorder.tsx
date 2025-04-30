// App.js or your component
import React, { useState } from "react";
import { Button, View, Text, Platform } from "react-native";
import { Audio } from "expo-av";

export default function App() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState("");

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        alert("Permission to access microphone is required!");
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
      console.error("Failed to start recording:", err);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setRecording(null);
    await recording.stopAndUnloadAsync();

    const uri = recording.getURI();
    console.log("Recording stopped and stored at", uri);

    // Upload to backend
    const formData = new FormData();

    if (uri) {
      const audioFile = {
        uri,
        name: "audio.m4a",
        type: "audio/x-m4a",
      } as any;

      formData.append("audio", audioFile);
    }

    try {
      console.log("Uploading audio to backend...");
      const response = await fetch("http://192.168.1.5:3000/transcribe", {
        method: "POST",
        // headers: {
        //   "Content-Type": "multipart/form-data",
        // },
        body: formData,
      });

      const data = await response.json();
      console.log("Transcript received:", data.transcript);
      setTranscript(data.transcript);
    } catch (err) {
      console.error("Failed to upload audio:", err);
    }
  }

  return (
    <View style={{ padding: 20, marginTop: 50 }}>
      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />
      {transcript ? (
        <Text style={{ marginTop: 20, fontSize: 16 }}>
          Transcript: {transcript}
        </Text>
      ) : null}
    </View>
  );
}
