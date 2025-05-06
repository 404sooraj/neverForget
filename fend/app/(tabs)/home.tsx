import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  FlatList,
  ActivityIndicator,
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
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);

  useEffect(() => {
    const unsubscribe = uploadQueue.addListener((queue) => {
      setQueueItems(queue);
    });

    // Fetch current task when component mounts
    fetchCurrentTask();

    return () => {
      unsubscribe();
      // Ensure stopRecording is called which now handles async cleanup
      (async () => {
        await stopRecording();
      })();
    };
  }, []);

  const fetchCurrentTask = async () => {
    if (!username) return;

    setIsLoadingTask(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/current-task/${username}`
      );
      if (!response.ok) throw new Error("Failed to fetch current task");

      const data = await response.json();
      setCurrentTask(data.currentTask);
    } catch (error) {
      console.error("Error fetching current task:", error);
      setCurrentTask("Unable to fetch current task");
    } finally {
      setIsLoadingTask(false);
    }
  };

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
      Alert.alert(
        "Recording Error",
        "Failed to stop previous segment. Recording halted."
      );
      return;
    }

    // If stop/unload was successful, add to upload queue
    if (stoppedAndUnloadedSuccessfully && audioUri && username) {
      await uploadQueue.addToQueue(audioUri, username);
    }

    // Old recording is processed. Clear ref before creating a new one.
    recordingRef.current = null;

    // Add a delay before starting the next recording segment
    await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay

    // Attempt to start a new recording segment
    try {
      console.log("Preparing new recording segment...");
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await newRecording.startAsync();
      recordingRef.current = newRecording;
      console.log("New segment recording started.");
    } catch (err) {
      console.error("Failed to start new recording segment:", err);
      await stopRecording();
      Alert.alert(
        "Recording Error",
        "Failed to start new segment. Recording halted."
      );
    }
  };

  async function startRecording() {
    if (isRecording) return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Microphone permission is required!"
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        friction: 3,
        useNativeDriver: true,
      }).start();
      console.log("Initial recording started.");

      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(
        handleIntervalTick,
        RECORDING_INTERVAL_MS
      );
      console.log(`Interval set for ${RECORDING_INTERVAL_MS / 1000} seconds.`);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setIsRecording(false);
      recordingRef.current = null;
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
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
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();

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
            item.status === "completed"
              ? "checkmark-circle"
              : item.status === "failed"
              ? "alert-circle"
              : item.status === "processing"
              ? "reload-circle"
              : "time"
          }
          size={24}
          color={
            item.status === "completed"
              ? "#4CAF50"
              : item.status === "failed"
              ? "#F44336"
              : item.status === "processing"
              ? "#2196F3"
              : "#FFC107"
          }
        />
        <Text style={styles.queueItemText}>
          {item.status === "completed"
            ? "Upload complete"
            : item.status === "failed"
            ? `Upload failed (${item.retries} attempts)`
            : item.status === "processing"
            ? "Uploading..."
            : "Waiting to upload"}
        </Text>
      </View>
      {item.status === "failed" && (
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
        <View style={styles.headerTop}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.greetingText}>Hello,</Text>
            <Text style={styles.usernameText}>{username}! 👋</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#495057" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.currentTaskContainer}>
        <View style={styles.currentTaskHeader}>
          <View style={styles.taskTitleContainer}>
            <Ionicons name="bulb-outline" size={24} color="#1877F2" />
            <Text style={styles.currentTaskTitle}>Current Focus</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchCurrentTask}
            disabled={isLoadingTask}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color="#1877F2"
              style={[isLoadingTask && styles.rotating]}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.currentTaskContent}>
          {isLoadingTask ? (
            <ActivityIndicator size="small" color="#1877F2" />
          ) : (
            <>
              <Text style={styles.currentTaskText}>
                {currentTask || "No active task detected"}
              </Text>
              <Text style={styles.taskHintText}>
                Start recording to capture your thoughts and ideas
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.recordingSection}>
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
          <Text style={styles.recordingStatus}>
            {isRecording ? "Recording in progress..." : "Tap to start recording"}
          </Text>
        </View>
      </View>

      {queueItems.length > 0 && (
        <View style={styles.queueContainer}>
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>Upload Queue</Text>
            <Text style={styles.queueCount}>{queueItems.length} items</Text>
          </View>
          <FlatList
            data={queueItems}
            renderItem={renderQueueItem}
            keyExtractor={(item, index) => index.toString()}
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
    backgroundColor: "#F5F7FA",
  },
  header: {
    backgroundColor: "#FFF",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E9F0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
  },
  currentTaskContainer: {
    margin: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentTaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  taskTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentTaskTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  currentTaskContent: {
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  currentTaskText: {
    fontSize: 16,
    color: "#1A1A1A",
    lineHeight: 24,
    marginBottom: 8,
  },
  taskHintText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  rotating: {
    opacity: 0.6,
  },
  recordingSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  recordButtonContainer: {
    alignItems: "center",
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1877F2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: "#DC3545",
  },
  recordingStatus: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  queueContainer: {
    margin: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  queueCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  queueList: {
    maxHeight: 200,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E9F0",
  },
  queueItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  queueItemText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#4B4F56",
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F0F8FF",
    borderRadius: 16,
    marginLeft: 12,
  },
  retryButtonText: {
    color: "#1877F2",
    fontSize: 12,
    fontWeight: "500",
  },
});
