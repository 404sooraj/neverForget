import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  Alert, // Import Alert
} from "react-native";
import { Audio } from "expo-av";
import { useState, useRef, useEffect } from "react"; // Import useRef and useEffect
import { RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from "@/modules/audio";
import { useAuth } from "../auth/AuthContext";
import { router } from "expo-router";

const RECORDING_INTERVAL_MS = 10 * 1000; // 1 minute

export default function HomeScreen() {
  // Use useRef for recording object and interval ID to avoid stale closures
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Fix: Change NodeJS.Timeout to number for React Native's setInterval return type
  const intervalRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false); // UI state
  const { username, signOut } = useAuth();

  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      stopRecording(); // Ensure recording stops and interval is cleared if component unmounts
    };
  }, []);

  // Function to send a recording segment
  const sendAudioSegment = async (recordingToStop: Audio.Recording) => {
    try {
      await recordingToStop.stopAndUnloadAsync();
      const uri = recordingToStop.getURI();
      console.log("Segment stored at:", uri);

      if (uri && username) {
        const formData = new FormData();
        formData.append("audio", {
          uri,
          name: `audio_${Date.now()}.m4a`, // Unique name for each segment
          type: Platform.OS === "ios" ? "audio/x-m4a" : "audio/m4a",
        } as any);
        formData.append("username", username);

        console.log(`Sending segment for user: ${username}`);
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/transcribe`,
          {
            method: "POST",
            body: formData,
            // Optional: Add headers if needed, e.g., for content type if server requires it
            // headers: {
            //   'Content-Type': 'multipart/form-data',
            // },
          }
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error || `HTTP error! status: ${response.status}`
          );
        }
        console.log("Segment upload result:", result);
      }
    } catch (err) {
      console.error("Failed to stop or upload segment", err);
      // Optionally show an alert to the user
      // Alert.alert("Upload Failed", "Could not send audio segment.");
    }
  };

  // Function to handle the interval tick
  const handleIntervalTick = async () => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) return;

    console.log("Interval tick: Stopping and sending segment...");
    await sendAudioSegment(currentRecording);

    // Start new recording immediately
    try {
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await newRecording.startAsync();
      recordingRef.current = newRecording; // Update the ref with the new recording object
      console.log("New segment recording started.");
    } catch (err) {
      console.error("Failed to start new recording segment", err);
      // Stop the process if restarting fails
      stopRecording();
      Alert.alert("Recording Error", "Failed to continue recording.");
    }
  };

  async function startRecording() {
    if (isRecording) return; // Prevent starting multiple times

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access microphone is required!"
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting initial recording...");
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await newRecording.startAsync();
      recordingRef.current = newRecording;
      setIsRecording(true);
      console.log("Initial recording started.");

      // Clear any existing interval before starting a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Start the interval timer
      intervalRef.current = setInterval(
        // Assigns a number ID
        handleIntervalTick,
        RECORDING_INTERVAL_MS
      );
      console.log(`Interval set for ${RECORDING_INTERVAL_MS / 1000} seconds.`);
    } catch (err) {
      console.error("Failed to start recording", err);
      setIsRecording(false); // Reset state on error
      recordingRef.current = null;
      // Fix: Check against null explicitly before clearing
      if (intervalRef.current !== null) clearInterval(intervalRef.current); // Clear interval on error
      intervalRef.current = null;
      Alert.alert("Recording Error", "Could not start recording.");
    }
  }

  async function stopRecording() {
    if (!isRecording && !recordingRef.current) {
      console.log("Recording already stopped.");
      return; // Already stopped
    }

    console.log("Stopping recording...");
    // Clear the interval timer
    // Fix: Check against null explicitly before clearing
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current); // clearInterval works with number IDs
      intervalRef.current = null;
      console.log("Interval cleared.");
    }

    const lastRecording = recordingRef.current;
    recordingRef.current = null; // Clear the ref immediately
    setIsRecording(false); // Update UI state

    if (lastRecording) {
      // Send the final segment
      console.log("Sending final segment...");
      await sendAudioSegment(lastRecording);
    }
    console.log("Recording stopped completely.");
  }

  const handleSignOut = async () => {
    stopRecording(); // Ensure recording is stopped before signing out
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
        style={[styles.recordButton, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.recordButtonText}>
          {isRecording ? "Stop Recording" : "Start Recording"}
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
    paddingTop: Platform.OS === "android" ? 25 : 0, // Adjust padding for Android status bar
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
    paddingVertical: 25, // Make button larger
    paddingHorizontal: 20,
    borderRadius: 15, // Slightly more rounded
    alignItems: "center",
    justifyContent: "center", // Center text vertically
    marginTop: "auto",
    marginBottom: "auto",
    minHeight: 80, // Ensure minimum height
    shadowColor: "#000", // Add shadow for depth
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingButton: {
    backgroundColor: "#ff3b30", // Red when recording
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 20, // Larger text
    fontWeight: "bold", // Bolder text
  },
});
