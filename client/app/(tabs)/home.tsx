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

const RECORDING_INTERVAL_MS = 60 * 1000; // 1 minute

export default function HomeScreen() {
  // Use useRef for recording object and interval ID to avoid stale closures
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Fix: Change NodeJS.Timeout to number for React Native's setInterval return type
  const intervalRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false); // UI state
  const { username, signOut } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current; // Animation value for button scale

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Haptic feedback
      // Start scale animation
      Animated.spring(scaleAnim, {
        toValue: 1.1, // Scale up slightly
        friction: 3,
        useNativeDriver: true,
      }).start();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Haptic feedback
    // Reset scale animation
    Animated.spring(scaleAnim, {
      toValue: 1, // Scale back to normal
      friction: 3,
      useNativeDriver: true,
    }).start();

    if (lastRecording) {
      // Send the final segment
      console.log("Sending final segment...");
      await sendAudioSegment(lastRecording);
    }
    console.log("Recording stopped completely.");
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
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  welcomeText: {
    fontSize: 28, // Slightly larger
    fontWeight: "bold", // Bolder
    color: "#1C1E21", // Darker color
  },
  signOutButton: {
    flexDirection: 'row', // Align icon and text
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#E4E6EB', // Slightly different grey
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 160, // Slightly larger button
    height: 160,
    borderRadius: 80, // Keep it circular
    backgroundColor: "#1877F2", // Facebook blue
    alignItems: "center",
    justifyContent: 'center',
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
