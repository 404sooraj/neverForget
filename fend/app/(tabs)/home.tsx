import { API_URL } from "../../services/config";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  FlatList,
  ActivityIndicator,
  View,
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

// Interface for transcription queue status
interface TranscriptionQueueStatus {
  queueLength: number;
  activeJobs: number;
  maxConcurrency: number;
  usesGPU: boolean;
  timestamp: string;
}

export default function HomeScreen() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { username, signOut } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);

  // Add state for transcription queue
  const [transcriptionQueue, setTranscriptionQueue] =
    useState<TranscriptionQueueStatus | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  useEffect(() => {
    const unsubscribe = uploadQueue.addListener((queue) => {
      setQueueItems(queue);
    });

    // Fetch current task when component mounts
    fetchCurrentTask();

    // Set up interval to fetch transcription queue status
    fetchTranscriptionQueue();
    const queueInterval = setInterval(fetchTranscriptionQueue, 5000); // Update every 5 seconds

    return () => {
      unsubscribe();
      clearInterval(queueInterval);
      // Ensure stopRecording is called which now handles async cleanup
      (async () => {
        await stopRecording();
      })();
    };
  }, []);

  const fetchTranscriptionQueue = async () => {
    setIsLoadingQueue(true);
    try {
      // Log the API URL for debugging
      const apiUrl = `${API_URL}/queue-status`;
      // console.log("Fetching from URL:", apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok)
        throw new Error(
          `Failed to fetch queue status: ${response.status} ${response.statusText}`
        );

      const data = await response.json();
      setTranscriptionQueue(data);
    } catch (error) {
      console.error("Error fetching transcription queue:", error);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchCurrentTask = async () => {
    if (!username) return;

    setIsLoadingTask(true);
    try {
      const response = await fetch(`${API_URL}/current-task/${username}`);
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

  // Render queue status
  const renderQueueStatus = () => {
    if (isLoadingQueue && !transcriptionQueue) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1877F2" />
          <Text style={styles.loadingText}>Loading transcription queue...</Text>
        </View>
      );
    }

    if (!transcriptionQueue) {
      return (
        <View style={styles.emptyQueueContainer}>
          <Ionicons name="server-outline" size={32} color="#CCCCCC" />
          <Text style={styles.emptyQueueText}>Queue status unavailable</Text>
        </View>
      );
    }

    const { queueLength, activeJobs, maxConcurrency, usesGPU } =
      transcriptionQueue;
    const hasActiveJobs = activeJobs > 0;
    const hasQueuedJobs = queueLength > 0;
    const totalJobs = queueLength + activeJobs;

    return (
      <View>
        {/* Main metrics row with large numbers */}
        <View style={styles.mainMetricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{totalJobs}</Text>
            <Text style={styles.metricLabel}>Total Jobs</Text>
          </View>

          <View style={[styles.metricCard, styles.activeJobsCard]}>
            <Text
              style={[
                styles.metricValue,
                hasActiveJobs ? styles.activeValue : {},
              ]}
            >
              {activeJobs}
            </Text>
            <Text style={styles.metricLabel}>Processing</Text>
          </View>

          <View style={[styles.metricCard, styles.queuedCard]}>
            <Text
              style={[
                styles.metricValue,
                hasQueuedJobs ? styles.queuedValue : {},
              ]}
            >
              {queueLength}
            </Text>
            <Text style={styles.metricLabel}>In Queue</Text>
          </View>
        </View>

        {/* Status message */}
        <View style={styles.queueStatusMessage}>
          <Ionicons
            name={
              hasActiveJobs
                ? "pulse"
                : hasQueuedJobs
                ? "time-outline"
                : "checkmark-circle"
            }
            size={18}
            color={
              hasActiveJobs ? "#1877F2" : hasQueuedJobs ? "#FFC107" : "#4CAF50"
            }
          />
          <Text style={styles.queueStatusMessageText}>
            {hasActiveJobs
              ? `Processing ${activeJobs} recording${
                  activeJobs > 1 ? "s" : ""
                } on ${usesGPU ? "GPU" : "CPU"}`
              : hasQueuedJobs
              ? `${queueLength} recording${
                  queueLength > 1 ? "s" : ""
                } waiting to be processed`
              : "All recordings processed"}
          </Text>
        </View>

        {/* Capacity indicator */}
        <View style={styles.capacityContainer}>
          <Text style={styles.capacityLabel}>System capacity:</Text>
          <View style={styles.capacityBarContainer}>
            <View
              style={[
                styles.capacityBar,
                {
                  width: `${Math.min(
                    100,
                    (activeJobs / maxConcurrency) * 100
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.capacityText}>
            {activeJobs}/{maxConcurrency}
          </Text>
        </View>

        {isLoadingQueue && (
          <View style={styles.refreshIndicator}>
            <ActivityIndicator size="small" color="#1877F2" />
          </View>
        )}
      </View>
    );
  };

  // Render queue container
  const renderQueueContainer = () => {
    return (
      <View style={styles.queueContainer}>
        <View style={styles.queueHeader}>
          <View style={styles.queueTitleContainer}>
            <Ionicons name="server" size={22} color="#1877F2" />
            <Text style={styles.queueTitle}>Transcription Queue</Text>
          </View>
          <TouchableOpacity
            onPress={fetchTranscriptionQueue}
            disabled={isLoadingQueue}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={isLoadingQueue ? "#CCCCCC" : "#1877F2"}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.queueStatusContainer}>{renderQueueStatus()}</View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.greetingText}>Hello,</Text>
            <Text style={styles.usernameText}>{username}! 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
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
              style={[
                styles.recordButton,
                isRecording && styles.recordingButton,
              ]}
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
            {isRecording
              ? "Recording in progress..."
              : "Tap to start recording"}
          </Text>
        </View>
      </View>

      {renderQueueContainer()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
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
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  rotating: {
    opacity: 0.6,
  },
  recordingSection: {
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
    padding: 20,
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
    marginBottom: 16,
  },
  queueTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  queueStatusContainer: {
    marginTop: 8,
  },
  mainMetricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    padding: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  activeJobsCard: {
    borderLeftWidth: 1,
    borderLeftColor: "#E5E9F0",
    borderRightWidth: 1,
    borderRightColor: "#E5E9F0",
    paddingHorizontal: 8,
  },
  queuedCard: {
    paddingLeft: 8,
  },
  activeValue: {
    color: "#4CAF50",
  },
  queuedValue: {
    color: "#FFC107",
  },
  queueStatusMessage: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    padding: 12,
  },
  queueStatusMessageText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  capacityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    padding: 12,
  },
  capacityLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
    width: 80,
  },
  capacityBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: "#E5E9F0",
    borderRadius: 6,
    marginRight: 8,
    overflow: "hidden",
  },
  capacityBar: {
    height: "100%",
    backgroundColor: "#1877F2",
    borderRadius: 6,
  },
  capacityText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
    width: 30,
    textAlign: "right",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  refreshIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyQueueContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
  },
  emptyQueueText: {
    marginTop: 10,
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
});
