import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  FlatList,
} from "react-native";
import { Audio } from "expo-av";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from "@/modules/audio";
import { useAuth } from "../auth/AuthContext";
import { router } from "expo-router";
import { uploadQueue } from "@/modules/uploadQueue";

const RECORDING_INTERVAL_MS = 10 * 1000; // 1 minute for testing, revert to 60 * 1000 for production

export default function HomeScreen() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { username, signOut } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [queueItems, setQueueItems] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = uploadQueue.addListener((queue) => {
      setQueueItems(queue);
    });

    return () => {
      unsubscribe();
      // Ensure stopRecording is called which now handles async cleanup
      (async () => {
        await stopRecording();
      })();
    };
  }, []);

  const handleIntervalTick = async () => {
    const recordingToProcess = recordingRef.current;
    if (!recordingToProcess) {
      console.warn("handleIntervalTick called without a current recording.");
      await stopRecording();
      return;
    }

    let stoppedAndUnloadedSuccessfully = false;
    let audioUri: string | null = null;

    try {
      console.log("Interval tick: Stopping and unloading current segment...");
      await recordingToProcess.stopAndUnloadAsync();
      audioUri = recordingToProcess.getURI();
      stoppedAndUnloadedSuccessfully = true;
      console.log("Segment stopped, unloaded. URI:", audioUri);
    } catch (err) {
      console.error("Critical error stopping/unloading segment:", err);
      recordingRef.current = null;
      await stopRecording();
      Alert.alert("Recording Error", "Failed to stop previous segment. Recording halted.");
      return;
    }

    // If stop/unload was successful, add to upload queue
    if (stoppedAndUnloadedSuccessfully && audioUri && username) {
      await uploadQueue.addToQueue(audioUri, username);
    }

    // Old recording is processed. Clear ref before creating a new one.
    recordingRef.current = null;

    // Add a delay before starting the next recording segment
    await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay

    // Attempt to start a new recording segment
    try {
      console.log("Preparing new recording segment...");
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      recordingRef.current = newRecording;
      console.log("New segment recording started.");
    } catch (err) {
      console.error("Failed to start new recording segment:", err);
      await stopRecording();
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
    recordingRef.current = null;

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
        if (uri && username) {
          await uploadQueue.addToQueue(uri, username);
        }
      } catch (err) {
        console.error("Error processing final audio segment:", err);
      }
    } else {
      console.log("No active recording to process for final segment.");
    }
    console.log("Recording process fully stopped.");
  }

  const handleSignOut = async () => {
    await stopRecording();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const renderQueueItem = ({ item }: { item: any }) => (
    <View style={styles.queueItem}>
      <View style={styles.queueItemContent}>
        <Ionicons 
          name={
            item.status === 'completed' ? 'checkmark-circle' :
            item.status === 'failed' ? 'alert-circle' :
            item.status === 'processing' ? 'reload-circle' : 'time'
          } 
          size={24} 
          color={
            item.status === 'completed' ? '#4CAF50' :
            item.status === 'failed' ? '#F44336' :
            item.status === 'processing' ? '#2196F3' : '#FFC107'
          }
        />
        <Text style={styles.queueItemText}>
          {item.status === 'completed' ? 'Upload complete' :
           item.status === 'failed' ? `Upload failed (${item.retries} attempts)` :
           item.status === 'processing' ? 'Uploading...' :
           'Waiting to upload'}
        </Text>
      </View>
      {item.status === 'failed' && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => uploadQueue.clearFailedUploads()}
        >
          <Text style={styles.retryButtonText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {username}!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#495057" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recordButtonContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={handleRecordPress}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={60}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {queueItems.length > 0 && (
        <View style={styles.queueContainer}>
          <Text style={styles.queueTitle}>Upload Queue</Text>
          <FlatList
            data={queueItems}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id}
            style={styles.queueList}
          />
        </View>
      )}
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
  queueContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1C1E21',
  },
  queueList: {
    maxHeight: 200,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EB',
  },
  queueItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  queueItemText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#4B4F56',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E4E6EB',
    borderRadius: 16,
    marginLeft: 12,
  },
  retryButtonText: {
    color: '#4B4F56',
    fontSize: 12,
    fontWeight: '500',
  },
});
