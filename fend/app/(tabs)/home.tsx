import { API_URL } from "../../services/config";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert,
  Animated,
  FlatList,
  ActivityIndicator,
  View,
  useColorScheme,
} from "react-native";
import { Audio } from "expo-av";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from "@/modules/audio";
import { useAuth } from "../auth/AuthContext";
import { router } from "expo-router";
import { uploadQueue } from "@/modules/uploadQueue";
import theme from "@/services/theme";
import Header from "@/components/ui/Header";
import Text from "@/components/ui/Text";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const RECORDING_INTERVAL_MS = 30 * 1000; // Recording interval of 30 seconds

// Interface for transcription queue status
interface TranscriptionQueueStatus {
  queueLength: number;
  activeJobs: number;
  maxConcurrency: number;
  usesGPU: boolean;
  timestamp: string;
  voskReady?: boolean;
}

export default function HomeScreen() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { username, signOut } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

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

    // Set up pulse animation for recording button
    startPulseAnimation();

    return () => {
      unsubscribe();
      clearInterval(queueInterval);
      // Ensure stopRecording is called which now handles async cleanup
      (async () => {
        await stopRecording();
      })();
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fetchTranscriptionQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const apiUrl = `${API_URL}/queue-status`;
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
      // Note: Audio file will be automatically deleted after successful upload by the upload queue
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
        useNativeDriver: true,
        friction: 5,
      }).start();

      // Set up interval for continuous recording
      const intervalId = setInterval(handleIntervalTick, RECORDING_INTERVAL_MS);
      // TypeScript won't let us store this as a number, but it is one.
      intervalRef.current = intervalId as unknown as number;
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Error", "Failed to start recording.");
    }
  }

  async function stopRecording() {
    if (!isRecording) return;

    // Clear the recording interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      const recording = recordingRef.current;
      setIsRecording(false);

      if (recording) {
        console.log("Stopping final recording segment...");
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri && username) {
          await uploadQueue.addToQueue(uri, username);
        }
      }
    } catch (err) {
      console.error("Error stopping recording:", err);
    } finally {
      // Always clear the recording reference and reset the UI
      recordingRef.current = null;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }).start();
    }
  }

  const handleSignOut = async () => {
    await stopRecording();
    signOut();
  };

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const renderCurrentTask = () => {
    const surfaceColor = isDarkMode ? theme.colors.secondary[800] : theme.colors.neutral[50];
    const borderColor = isDarkMode ? theme.colors.secondary[700] : theme.colors.secondary[200];
    
    return (
      <Card 
        style={styles.currentTaskCard}
        backgroundColor={surfaceColor}
        borderColor={borderColor}
        elevation="sm"
      >
        <View style={styles.taskHeader}>
          <Ionicons 
            name="list" 
            size={20} 
            color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]} 
          />
          <Text 
            variant="label" 
            weight="medium" 
            style={{marginLeft: theme.spacing.xs}}
            color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
          >
            CURRENT FOCUS
          </Text>
        </View>
        
        {isLoadingTask ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.secondary[500]} />
          </View>
        ) : (
          <Text variant="body" weight="medium">
            {currentTask || "No current task detected"}
          </Text>
        )}
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchCurrentTask}
        >
          <Ionicons 
            name="refresh" 
            size={16} 
            color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]} 
          />
          <Text 
            variant="caption" 
            style={{marginLeft: 4}}
            color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]}
          >
            Refresh
          </Text>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderQueueStatus = () => {
    if (!transcriptionQueue) return null;
    
    const { queueLength, activeJobs, maxConcurrency, voskReady } = transcriptionQueue;
    const queueItems = queueLength + activeJobs;
    
    if (queueItems === 0) return null;
    
    const surfaceColor = isDarkMode ? theme.colors.secondary[800] : theme.colors.neutral[50];
    const borderColor = isDarkMode ? theme.colors.secondary[700] : theme.colors.secondary[200];
    
    return (
      <Card 
        style={styles.queueCard}
        backgroundColor={surfaceColor}
        borderColor={borderColor}
        elevation="sm"
      >
        <View style={styles.taskHeader}>
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={isDarkMode ? theme.colors.warning[400] : theme.colors.warning[600]} 
          />
          <Text 
            variant="label" 
            weight="medium" 
            style={{marginLeft: theme.spacing.xs}}
            color={isDarkMode ? theme.colors.warning[400] : theme.colors.warning[600]}
          >
            PROCESSING QUEUE
          </Text>
        </View>
        
        <Text variant="body">
          {`${activeJobs} active, ${queueLength} pending recordings`}
        </Text>
        
        <View style={styles.queueInfoContainer}>
          <View style={styles.queueInfoItem}>
            <Ionicons 
              name={voskReady ? "checkmark-circle" : "alert-circle"} 
              size={14} 
              color={voskReady ? 
                (isDarkMode ? theme.colors.success[400] : theme.colors.success[600]) : 
                (isDarkMode ? theme.colors.warning[400] : theme.colors.warning[600])
              } 
            />
            <Text 
              variant="caption" 
              style={{marginLeft: 4}}
              color={isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600]}
            >
              {voskReady ? "Vosk ready" : "Using Whisper"}
            </Text>
          </View>
          
          <View style={styles.queueInfoItem}>
            <Ionicons 
              name={transcriptionQueue.usesGPU ? "hardware-chip" : "desktop"} 
              size={14} 
              color={isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600]} 
            />
            <Text 
              variant="caption" 
              style={{marginLeft: 4}}
              color={isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600]}
            >
              {transcriptionQueue.usesGPU ? "GPU acceleration" : "CPU processing"}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[
      styles.container, 
      {backgroundColor: isDarkMode ? theme.colors.secondary[900] : theme.colors.white}
    ]}>
      <Header 
        title="Never Forget"
        subtitleText={username ? `Welcome back, ${username}` : undefined}
        rightAction={{
          icon: "log-out-outline",
          onPress: handleSignOut,
          accessibilityLabel: "Sign out",
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentTask()}
        {renderQueueStatus()}
        
        <View style={styles.recordingSection}>
          <Animated.View 
            style={[
              styles.recordButtonPulse,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
                backgroundColor: isRecording 
                  ? 'rgba(239, 68, 68, 0.2)' // theme.colors.error[500] with opacity
                  : 'transparent'
              }
            ]}
          />
          
          <Animated.View
            style={[
              styles.recordButtonContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.recordButton,
                {
                  backgroundColor: isRecording 
                    ? theme.colors.error[600] 
                    : theme.colors.primary[600]
                }
              ]}
              onPress={handleRecordPress}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? "square" : "mic"}
                size={36}
                color="white"
              />
            </TouchableOpacity>
          </Animated.View>
          
          <Text 
            variant="body" 
            weight="medium" 
            align="center"
            style={styles.recordingText}
          >
            {isRecording 
              ? "Recording in progress... Tap to stop" 
              : "Tap to start recording"
            }
          </Text>
          
          {isRecording && (
            <Text 
              variant="caption" 
              align="center" 
              style={styles.recordingInfo}
              color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]}
            >
              Audio is processed in 30-second segments
            </Text>
          )}
        </View>
        
        {queueItems.length > 0 && (
          <View style={styles.queueListContainer}>
            <View style={styles.queueListHeader}>
              <Text variant="h4" weight="semibold">Local Queue</Text>
              <Text 
                variant="caption"
                color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]}
              >
                {queueItems.length} recording{queueItems.length !== 1 ? 's' : ''} waiting to upload
              </Text>
            </View>
            
            <FlatList
              data={queueItems}
              keyExtractor={(item, index) => `queue-item-${index}`}
              renderItem={({ item, index }) => (
                <Card
                  style={styles.queueItem}
                  backgroundColor={isDarkMode ? theme.colors.secondary[800] : theme.colors.white}
                  borderColor={isDarkMode ? theme.colors.secondary[700] : theme.colors.secondary[200]}
                >
                  <View style={styles.queueItemContent}>
                    <View style={styles.queueItemInfo}>
                      <Ionicons 
                        name="musical-note" 
                        size={18} 
                        color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
                      />
                      <Text 
                        variant="body-sm" 
                        weight="medium" 
                        style={{marginLeft: theme.spacing.xs}}
                      >
                        Audio Recording {index + 1}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.queueItemStatus,
                      { 
                        backgroundColor: isDarkMode 
                          ? theme.colors.secondary[700] 
                          : theme.colors.secondary[100] 
                      }
                    ]}>
                      <Text variant="caption" weight="medium">
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}
              style={styles.queueList}
              horizontal={false}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
      
      <View style={styles.summaryButton}>
        <Button
          title="View Your Summaries"
          variant="primary"
          leftIcon="book-outline"
          fullWidth
          onPress={() => router.navigate('/summary')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100, // Extra padding at bottom for button
  },
  currentTaskCard: {
    marginTop: theme.spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  loadingContainer: {
    height: 40,
    justifyContent: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    padding: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  queueCard: {
    marginTop: theme.spacing.md,
  },
  queueInfoContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  queueInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  recordingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    position: 'relative',
  },
  recordButtonPulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  recordButtonContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  recordingText: {
    marginBottom: theme.spacing.xs,
  },
  recordingInfo: {
    marginBottom: theme.spacing.md,
  },
  queueListContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  queueListHeader: {
    marginBottom: theme.spacing.sm,
  },
  queueList: {
    width: '100%',
  },
  queueItem: {
    marginVertical: theme.spacing.xs,
  },
  queueItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueItemStatus: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.borderRadius.full,
  },
  summaryButton: {
    position: 'absolute',
    bottom: theme.spacing.lg + theme.layout.bottomTabHeight,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.md,
  },
});
