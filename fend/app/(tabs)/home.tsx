import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
  Animated, // Import Animated
} from "react-native";
import { Audio } from "expo-av";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons
import * as Haptics from "expo-haptics"; // Import Haptics
import { RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from "@/modules/audio";
import { useAuth } from "../auth/AuthContext";
import { router } from "expo-router";

const RECORDING_INTERVAL_MS = 10 * 1000; // 1 minute for testing, revert to 60 * 1000 for production

export default function HomeScreen() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { username, signOut } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      // Ensure stopRecording is called which now handles async cleanup
      (async () => {
        await stopRecording();
      })();
    };
  }, []);

  // Refactored: only uploads audio data, assumes URI is valid
  const uploadAudio = async (uri: string, user: string | null) => {
    if (!uri || !user) {
      console.log("No URI or username provided to uploadAudio, skipping.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: `audio_${Date.now()}.m4a`,
        type: Platform.OS === "ios" ? "audio/x-m4a" : "audio/m4a",
      } as any);
      formData.append("username", user);

      console.log(`Uploading segment for user: ${user}`);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/transcribe`,
        {
          method: "POST",
          body: formData,
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      console.log("Segment upload result:", result);
    } catch (err) {
      console.error("Failed to upload audio segment:", err);
      // Alert.alert("Upload Failed", "Could not send audio segment data.");
      // Decide if this error should stop the recording cycle or just be logged.
      // For now, it's logged, and the recording cycle attempts to continue.
    }
  };

  const handleIntervalTick = async () => {
    const recordingToProcess = recordingRef.current;
    if (!recordingToProcess) {
      console.warn("handleIntervalTick called without a current recording.");
      // This case should ideally be prevented by clearing interval when recording stops.
      // If it happens, try to stop everything to be safe.
      await stopRecording(); 
      return;
    }

    let stoppedAndUnloadedSuccessfully = false;
    let audioUri: string | null = null;

    try {
      console.log("Interval tick: Stopping and unloading current segment...");
      await recordingToProcess.stopAndUnloadAsync();
      audioUri = recordingToProcess.getURI(); // Get URI after successful stop/unload
      stoppedAndUnloadedSuccessfully = true;
      console.log("Segment stopped, unloaded. URI:", audioUri);
    } catch (err) {
      console.error("Critical error stopping/unloading segment:", err);
      recordingRef.current = null; // Clear ref to problematic recording
      await stopRecording(); // Full stop, clears interval, updates UI
      Alert.alert("Recording Error", "Failed to stop previous segment. Recording halted.");
      return; // Do not proceed to start a new recording
    }

    // If stop/unload was successful, proceed to upload
    if (stoppedAndUnloadedSuccessfully && audioUri) {
      await uploadAudio(audioUri, username);
    }

    // Old recording is processed. Clear ref before creating a new one.
    recordingRef.current = null;

    // Attempt to start a new recording segment
    try {
      console.log("Preparing new recording segment...");
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await newRecording.startAsync();
      recordingRef.current = newRecording; // Store new recording in ref
      console.log("New segment recording started.");
    } catch (err) {
      console.error("Failed to start new recording segment:", err);
      // recordingRef.current is either null or the failed newRecording instance
      await stopRecording(); // Full stop, clears interval, updates UI
      Alert.alert("Recording Error", "Failed to start new segment. Recording halted.");
    }
  };

  async function startRecording() {
    if (isRecording) return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Microphone permission is required!");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      console.log("Starting initial recording...");
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      recordingRef.current = newRecording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(scaleAnim, { toValue: 1.1, friction: 3, useNativeDriver: true }).start();
      console.log("Initial recording started.");

      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(handleIntervalTick, RECORDING_INTERVAL_MS);
      console.log(`Interval set for ${RECORDING_INTERVAL_MS / 1000} seconds.`);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setIsRecording(false);
      recordingRef.current = null;
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
      Alert.alert("Recording Error", "Could not start recording.");
    }
  }

  async function stopRecording() {
    console.log("Stop recording requested...");
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log("Interval cleared.");
    }

    const lastRecording = recordingRef.current;
    recordingRef.current = null; // Clear ref immediately

    // Update UI and animation regardless of whether a recording was active
    if (isRecording) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsRecording(false);
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();

    if (lastRecording) {
      console.log("Processing final segment...");
      try {
        await lastRecording.stopAndUnloadAsync();
        const uri = lastRecording.getURI();
        console.log("Final segment stopped, URI:", uri);
        if (uri) {
          await uploadAudio(uri, username); // Upload the final segment
        }
      } catch (err) {
        console.error("Error processing final audio segment:", err);
        // Alert.alert("Final Segment Error", "Could not process the final audio segment.");
      }
    } else {
        console.log("No active recording to process for final segment.");
    }
    console.log("Recording process fully stopped.");
  }

  const handleSignOut = async () => {
    await stopRecording(); // Stop recording first
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Haptic feedback
    await signOut();
    router.replace("/auth");
  };

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {username}!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          {/* Icon added */}
          <Ionicons name="log-out-outline" size={24} color="#495057" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recordButtonContainer}>
        {/* Wrap TouchableOpacity in Animated.View */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={handleRecordPress} // Use combined handler
            activeOpacity={0.8} // Slightly more feedback
          >
            {/* Conditional Icon */}
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={60} // Larger icon
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5", // Slightly different light background
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 60, // Even more spacing
    paddingTop: Platform.OS === "android" ? 40 : 20,
  },
  welcomeText: {
    fontSize: 28, // Slightly larger
    fontWeight: "bold", // Bolder
    color: "#1C1E21", // Darker color
  },
  signOutButton: {
    flexDirection: "row", // Align icon and text
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#E4E6EB", // Slightly different grey
    borderRadius: 20, // More rounded
  },
  signOutText: {
    color: "#4B4F56", // Adjusted text color
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8, // Space between icon and text
  },
  recordButtonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  recordButton: {
    width: 160, // Slightly larger button
    height: 160,
    borderRadius: 80, // Keep it circular
    backgroundColor: "#1877F2", // Facebook blue
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
    borderWidth: 3, // Add a subtle border
    borderColor: "rgba(255, 255, 255, 0.5)", // White border
  },
  recordingButton: {
    backgroundColor: "#E74C3C", // Softer red
    shadowColor: "#C0392B", // Darker red shadow
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  // Removed recordButtonText as it's replaced by icons
});
