import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Alert,
  Share,
  Animated,
  useColorScheme,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { BlurView } from "expo-blur";
import { format } from "date-fns";
import theme from "@/services/theme";
import Header from "@/components/ui/Header";
import Text from "@/components/ui/Text";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { API_URL } from "../../services/config";
type Transcript = {
  _id: string;
  transcript: string;
  timestamp: string;
  summary?: string;
  oneLiner?: string;
  audioFile: string;
  isSummarized: boolean;
  summaryError?: string;
  duration: number;
  createdAt: string;
};

export default function SummaryScreen() {
  const { username } = useAuth();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [clearAllConfirmVisible, setClearAllConfirmVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const fetchTranscripts = useCallback(async () => {
    try {
      if (!username) return;

      const response = await fetch(`${API_URL}/transcripts/${username}`);
      const data = await response.json();

      if (response.ok) {
        setTranscripts(data || []);
        if (selectedTranscript) {
          const updatedTranscript = data.find(
            (t: Transcript) => t._id === selectedTranscript._id
          );
          if (updatedTranscript) {
            setSelectedTranscript(updatedTranscript);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching transcripts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [username, selectedTranscript]);

  useEffect(() => {
    fetchTranscripts();
  }, []);

  // Add animation effect when transcripts are loaded
  useEffect(() => {
    if (transcripts.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [transcripts, fadeAnim, scaleAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTranscripts();
  }, [fetchTranscripts]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const formatRelativeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        return formatDate(dateString);
      }
    } catch (error) {
      return "Unknown date";
    }
  };

  const openTranscriptDetail = (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setModalVisible(true);
  };

  const closeModal = () => {
    stopSpeaking();
    setModalVisible(false);
    setSelectedTranscript(null);
  };

  const handleDelete = async () => {
    if (!selectedTranscript) return;

    try {
      const response = await fetch(
        `${API_URL}/transcripts/${selectedTranscript._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        }
      );

      if (response.ok) {
        setTranscripts((prev) =>
          prev.filter((t) => t._id !== selectedTranscript._id)
        );
        setDeleteConfirmVisible(false);
        setModalVisible(false);
        setSelectedTranscript(null);
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.error || "Failed to delete transcript");
      }
    } catch (error) {
      console.error("Error deleting transcript:", error);
      Alert.alert("Error", "Failed to delete transcript");
    }
  };

  const showDeleteConfirm = () => {
    setDeleteConfirmVisible(true);
  };

  const showClearAllConfirm = () => {
    if (transcripts.length === 0) {
      Alert.alert("Info", "No summaries to clear");
      return;
    }
    setClearAllConfirmVisible(true);
  };

  const handleClearAll = async () => {
    try {
      const deletePromises = transcripts.map((transcript) => 
        fetch(`${API_URL}/transcripts/${transcript._id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        })
      );
      
      await Promise.all(deletePromises);
      setTranscripts([]);
      setClearAllConfirmVisible(false);
    } catch (error) {
      console.error("Error deleting all transcripts:", error);
      Alert.alert("Error", "Failed to delete all transcripts");
    }
  };

  const handleShare = async () => {
    if (!selectedTranscript) return;

    try {
      // Prepare the share content
      let shareContent = "";

      // Add one-liner if available
      if (selectedTranscript.oneLiner) {
        shareContent += `${selectedTranscript.oneLiner}\n\n`;
      }

      // Add detailed summary if available
      if (selectedTranscript.summary) {
        shareContent += `Detailed Summary:\n${selectedTranscript.summary}\n\n`;
      }

      // Add transcript
      shareContent += `Full Transcript:\n${selectedTranscript.transcript}\n\n`;

      // Add date
      shareContent += `Date: ${formatDate(selectedTranscript.timestamp)}`;

      // Share the content
      await Share.share({
        message: shareContent,
        title: selectedTranscript.oneLiner || "Conversation Summary",
      });
    } catch (error) {
      console.error("Error sharing transcript:", error);
      Alert.alert("Error", "Failed to share transcript");
    }
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const speakSummary = async (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    try {
      setIsSpeaking(true);
      const options = {
        voice: "", // use default voice
        rate: 0.9, // slightly slower
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      };
      await Speech.speak(text, options);
    } catch (error) {
      console.error("Error speaking text:", error);
      setIsSpeaking(false);
      Alert.alert("Error", "Failed to speak text");
    }
  };

  const renderTranscriptItem = ({
    item,
    index,
  }: {
    item: Transcript;
    index: number;
  }) => {
    // Different colors for alternating items
    const isEvenIndex = index % 2 === 0;
    const itemBgColor = isDarkMode 
      ? (isEvenIndex ? theme.colors.secondary[800] : theme.colors.secondary[800]) 
      : (isEvenIndex ? theme.colors.white : theme.colors.white);
    
    const borderColor = isDarkMode 
      ? theme.colors.secondary[700] 
      : theme.colors.secondary[200];

    // Handle pending summaries or errors
    const isPending = !item.isSummarized;
    const hasError = item.summaryError && item.summaryError.length > 0;
    
    return (
      <Animated.View 
        style={[
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <Card
          style={styles.transcriptCard}
          backgroundColor={itemBgColor}
          borderColor={borderColor}
          elevation="sm"
          onPress={() => openTranscriptDetail(item)}
        >
          <View style={styles.cardHeader}>
            {isPending ? (
              <View style={styles.statusChip}>
                <Ionicons 
                  name="time-outline" 
                  size={14} 
                  color={theme.colors.warning[600]} 
                />
                <Text 
                  variant="caption" 
                  weight="medium" 
                  style={{ marginLeft: 4 }}
                  color={theme.colors.warning[600]}
                >
                  Processing
                </Text>
              </View>
            ) : hasError ? (
              <View style={styles.statusChip}>
                <Ionicons 
                  name="alert-circle-outline" 
                  size={14} 
                  color={theme.colors.error[600]} 
                />
                <Text 
                  variant="caption" 
                  weight="medium" 
                  style={{ marginLeft: 4 }}
                  color={theme.colors.error[600]}
                >
                  Error
                </Text>
              </View>
            ) : (
              <Text
                variant="caption"
                style={styles.dateText}
                color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]}
              >
                {formatRelativeDate(item.timestamp)}
              </Text>
            )}
          </View>
          
          <Text variant="h4" weight="semibold" style={styles.cardTitle}>
            {item.oneLiner || (isPending 
              ? "Processing transcript..." 
              : hasError 
                ? "Failed to generate summary" 
                : "No summary available"
            )}
          </Text>
          
          <Text 
            variant="body-sm" 
            numberOfLines={2} 
            style={styles.previewText}
            color={isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600]}
          >
            {isPending
              ? "Your transcript is being processed. This might take a minute..."
              : hasError
              ? `Error: ${item.summaryError}`
              : item.summary || "No detailed summary available"}
          </Text>
          
          <View style={styles.cardFooter}>
            <Ionicons 
              name="chatbubble-outline" 
              size={14} 
              color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]} 
            />
            <Text
              variant="caption"
              style={{ marginLeft: 4 }}
              color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]}
            >
              {(item.transcript || "").length > 100 
                ? item.transcript.slice(0, 100).trim() + "..." 
                : item.transcript || "No transcript content"
              }
            </Text>
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedTranscript) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={80}
            tint={isDarkMode ? "dark" : "light"}
          />
          <View 
            style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode 
                  ? theme.colors.secondary[800] 
                  : theme.colors.white
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text 
                variant="caption" 
                weight="medium"
                color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]}
              >
                {formatDate(selectedTranscript.timestamp)}
              </Text>
              <View style={styles.modalHeaderButtons}>
                <TouchableOpacity 
                  onPress={handleShare} 
                  style={styles.headerActionButton}
                >
                  <Ionicons
                    name="share-outline"
                    size={24}
                    color={isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600]}
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={showDeleteConfirm} 
                  style={styles.headerActionButton}
                >
                  <Ionicons
                    name="trash-outline"
                    size={24}
                    color={theme.colors.error[500]}
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={closeModal} 
                  style={styles.headerActionButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600]}
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
            >
              {/* One-liner section */}
              <View style={styles.summarySection}>
                <View style={styles.sectionHeader}>
                  <Text 
                    variant="label" 
                    weight="medium"
                    color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
                  >
                    ONE-LINE SUMMARY
                  </Text>
                  <TouchableOpacity 
                    onPress={() => speakSummary(selectedTranscript.oneLiner || "")}
                    disabled={!selectedTranscript.oneLiner}
                  >
                    <Ionicons
                      name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                      size={20}
                      color={
                        selectedTranscript.oneLiner
                          ? (isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600])
                          : (isDarkMode ? theme.colors.neutral[700] : theme.colors.secondary[300])
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text 
                  variant="h3" 
                  weight="semibold" 
                  style={styles.oneLinerText}
                >
                  {selectedTranscript.oneLiner || "No one-liner summary available"}
                </Text>
              </View>
              
              {/* Detailed summary section */}
              <View style={styles.summarySection}>
                <View style={styles.sectionHeader}>
                  <Text 
                    variant="label" 
                    weight="medium"
                    color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
                  >
                    DETAILED SUMMARY
                  </Text>
                  <TouchableOpacity 
                    onPress={() => speakSummary(selectedTranscript.summary || "")}
                    disabled={!selectedTranscript.summary}
                  >
                    <Ionicons
                      name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                      size={20}
                      color={
                        selectedTranscript.summary
                          ? (isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600])
                          : (isDarkMode ? theme.colors.neutral[700] : theme.colors.secondary[300])
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text variant="body" style={styles.summaryText}>
                  {selectedTranscript.summary || "No detailed summary available"}
                </Text>
              </View>
              
              {/* Full transcript section */}
              <View style={styles.summarySection}>
                <View style={styles.sectionHeader}>
                  <Text 
                    variant="label" 
                    weight="medium"
                    color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[600]}
                  >
                    FULL TRANSCRIPT
                  </Text>
                </View>
                <Text 
                  variant="body-sm" 
                  style={styles.transcriptText}
                  color={isDarkMode ? theme.colors.neutral[300] : theme.colors.secondary[600]}
                >
                  {selectedTranscript.transcript || "No transcript available"}
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title="Close"
                variant="outline"
                onPress={closeModal}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              />
              <Button
                title="Share"
                variant="primary"
                leftIcon="share-outline"
                onPress={handleShare}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDeleteConfirmModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={deleteConfirmVisible}
      onRequestClose={() => setDeleteConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={80}
          tint={isDarkMode ? "dark" : "light"}
        />
        <View 
          style={[
            styles.confirmDialog,
            {
              backgroundColor: isDarkMode 
                ? theme.colors.secondary[800] 
                : theme.colors.white
            }
          ]}
        >
          <Ionicons 
            name="alert-circle" 
            size={40} 
            color={theme.colors.error[500]} 
            style={styles.confirmIcon} 
          />
          <Text variant="h4" weight="bold" style={styles.confirmTitle}>
            Delete Summary
          </Text>
          <Text 
            variant="body" 
            align="center" 
            style={styles.confirmMessage}
          >
            Are you sure you want to delete this summary? This action cannot be undone.
          </Text>
          <View style={styles.confirmButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setDeleteConfirmVisible(false)}
              style={{ flex: 1, marginRight: theme.spacing.sm }}
            />
            <Button
              title="Delete"
              variant="danger"
              leftIcon="trash-outline"
              onPress={handleDelete}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderClearAllConfirmModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={clearAllConfirmVisible}
      onRequestClose={() => setClearAllConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={80}
          tint={isDarkMode ? "dark" : "light"}
        />
        <View 
          style={[
            styles.confirmDialog,
            {
              backgroundColor: isDarkMode 
                ? theme.colors.secondary[800] 
                : theme.colors.white
            }
          ]}
        >
          <Ionicons 
            name="warning" 
            size={40} 
            color={theme.colors.warning[500]} 
            style={styles.confirmIcon} 
          />
          <Text variant="h4" weight="bold" style={styles.confirmTitle}>
            Clear All Summaries
          </Text>
          <Text 
            variant="body" 
            align="center" 
            style={styles.confirmMessage}
          >
            Are you sure you want to delete all your summaries? This action cannot be undone.
          </Text>
          <View style={styles.confirmButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setClearAllConfirmVisible(false)}
              style={{ flex: 1, marginRight: theme.spacing.sm }}
            />
            <Button
              title="Clear All"
              variant="danger"
              leftIcon="trash-outline"
              onPress={handleClearAll}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[
      styles.container,
      {backgroundColor: isDarkMode ? theme.colors.secondary[900] : theme.colors.white}
    ]}>
      <Header 
        title="Memory Summaries"
        rightAction={{
          icon: "trash-outline",
          onPress: showClearAllConfirm,
          accessibilityLabel: "Clear all summaries",
        }}
      />
      
      <FlatList
        data={transcripts}
        renderItem={renderTranscriptItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <>
                <Ionicons 
                  name="hourglass-outline" 
                  size={50} 
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[400]} 
                />
                <Text 
                  variant="h4" 
                  weight="semibold" 
                  style={styles.emptyStateTitle}
                >
                  Loading summaries...
                </Text>
              </>
            ) : (
              <>
                <Ionicons 
                  name="document-text-outline" 
                  size={50} 
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[400]} 
                />
                <Text 
                  variant="h4" 
                  weight="semibold" 
                  style={styles.emptyStateTitle}
                >
                  No summaries yet
                </Text>
                <Text 
                  variant="body" 
                  align="center" 
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.secondary[500]}
                  style={styles.emptyStateText}
                >
                  Record your first conversation from the home screen to get started.
                </Text>
              </>
            )}
          </View>
        }
      />
      
      {renderDetailModal()}
      {renderDeleteConfirmModal()}
      {renderClearAllConfirmModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  transcriptCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: theme.spacing.xs,
  },
  cardTitle: {
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    textAlign: "right",
  },
  previewText: {
    marginBottom: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.spacing.sm,
    backgroundColor: "rgba(255, 159, 10, 0.1)",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.md,
  },
  modalContent: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  modalHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  modalBody: {
    padding: theme.spacing.md,
    maxHeight: "80%",
  },
  summarySection: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  oneLinerText: {
    marginBottom: theme.spacing.md,
  },
  summaryText: {
    lineHeight: 24,
  },
  transcriptText: {
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  confirmDialog: {
    width: "90%",
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.lg,
  },
  confirmIcon: {
    marginBottom: theme.spacing.md,
  },
  confirmTitle: {
    marginBottom: theme.spacing.sm,
  },
  confirmMessage: {
    marginBottom: theme.spacing.lg,
  },
  confirmButtons: {
    flexDirection: "row",
    width: "100%",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
  },
  emptyStateTitle: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    textAlign: "center",
    maxWidth: 300,
  },
});
