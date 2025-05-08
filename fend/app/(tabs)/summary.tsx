import {
  View,
  Text,
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
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { BlurView } from "expo-blur";
import { format } from "date-fns";

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
  const [selectedTranscript, setSelectedTranscript] =
    useState<Transcript | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [clearAllConfirmVisible, setClearAllConfirmVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [transcripts, fadeAnim]);

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

  const openTranscriptDetail = (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setModalVisible(true);
  };

  const closeModal = () => {
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

  const handleRefreshSummary = async () => {
    if (!selectedTranscript) return;

    try {
      const response = await fetch(`${API_URL}/transcripts/${username}`);
      const data = await response.json();

      if (response.ok) {
        const updatedTranscript = data.find(
          (t: Transcript) => t._id === selectedTranscript._id
        );
        if (updatedTranscript) {
          setSelectedTranscript(updatedTranscript);
          setTranscripts((prev) =>
            prev.map((t) =>
              t._id === updatedTranscript._id ? updatedTranscript : t
            )
          );
        }
      }
    } catch (error) {
      console.error("Error refreshing summary:", error);
      Alert.alert("Error", "Failed to refresh summary");
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

      await Share.share({
        message: shareContent,
        title: "Never Forget - Memory Summary",
      });
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Error", "Failed to share summary");
    }
  };

  const showClearAllConfirm = () => {
    if (transcripts.length === 0) {
      Alert.alert("No Memories", "There are no memories to clear.");
      return;
    }
    setClearAllConfirmVisible(true);
  };

  const handleClearAll = async () => {
    try {
      if (transcripts.length === 0 || !username) {
        setClearAllConfirmVisible(false);
        return;
      }

      setLoading(true);
      
      const deletePromises = transcripts.map(transcript => 
        fetch(`${API_URL}/transcripts/${transcript._id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        })
      );
      
      const results = await Promise.allSettled(deletePromises);
      
      // Check if all deletions were successful
      const allSucceeded = results.every(
        result => result.status === 'fulfilled' && (result.value as Response).ok
      );
      
      if (allSucceeded) {
        setTranscripts([]);
        Alert.alert("Success", "All memories have been cleared.");
      } else {
        const failedCount = results.filter(
          result => result.status === 'rejected' || !(result.value as Response).ok
        ).length;
        
        if (failedCount === results.length) {
          Alert.alert("Error", "Failed to clear memories. Please try again.");
        } else {
          // Refresh to get updated list
          fetchTranscripts();
          Alert.alert(
            "Partial Success", 
            `${results.length - failedCount} of ${results.length} memories were cleared. ${failedCount} failed.`
          );
        }
      }
    } catch (error) {
      console.error("Error clearing all transcripts:", error);
      Alert.alert("Error", "Failed to clear memories. Please try again.");
    } finally {
      setLoading(false);
      setClearAllConfirmVisible(false);
    }
  };

  const renderTranscriptItem = ({
    item,
    index,
  }: {
    item: Transcript;
    index: number;
  }) => {
    const formattedDateTime = (() => {
      try {
        const date = new Date(item.createdAt || item.timestamp);
        if (isNaN(date.getTime())) {
          return { date: "Invalid date", time: "" };
        }
        return {
          date: format(date, "MMMM d, yyyy"),
          time: format(date, "h:mm a"),
        };
      } catch (error) {
        console.error("Error formatting date:", error);
        return { date: "Invalid date", time: "" };
      }
    })();

    return (
      <View style={styles.transcriptCard}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => {
            setSelectedTranscript(item);
            setModalVisible(true);
          }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={16} color="#007AFF" />
              <Text style={styles.dateText}>{formattedDateTime.date}</Text>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.timeText}>{formattedDateTime.time}</Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.summary ? "#4CAF50" : "#FFC107" },
                ]}
              />
              <Text style={styles.statusText}>
                {item.summary ? "Completed" : "Processing"}
              </Text>
            </View>
          </View>

          <Text style={styles.oneLiner} numberOfLines={2}>
            {item.oneLiner ||
              item.summary?.substring(0, 100) ||
              "Processing your memory..."}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedTranscript) return null;

    const speakSummary = async (text: string) => {
      try {
        const isSpeaking = await Speech.isSpeakingAsync();
        if (isSpeaking) {
          await Speech.stop();
        } else {
          await Speech.speak(text, {
            language: "en",
            rate: 0.9,
            pitch: 1.0,
          });
        }
      } catch (error) {
        console.error("Error with text-to-speech:", error);
      }
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <BlurView intensity={90} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRefreshSummary}
                >
                  <Ionicons name="refresh-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <Ionicons name="share-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={showDeleteConfirm}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedTranscript?.oneLiner && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Key Takeaway</Text>
                  <Text style={styles.oneLinerText}>
                    {selectedTranscript.oneLiner}
                  </Text>
                </View>
              )}

              {selectedTranscript?.summary && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <Text style={styles.summaryText}>
                    {selectedTranscript.summary}
                  </Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Full Transcript</Text>
                <Text style={styles.transcriptText}>
                  {selectedTranscript?.transcript || "Processing..."}
                </Text>
              </View>
            </ScrollView>
          </View>
        </BlurView>
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
      <BlurView intensity={90} style={styles.confirmModalContainer}>
        <View style={styles.confirmModal}>
          <View style={styles.confirmHeader}>
            <Ionicons name="warning" size={32} color="#FF3B30" />
            <Text style={styles.confirmTitle}>Delete Memory</Text>
          </View>
          <Text style={styles.confirmText}>
            Are you sure you want to delete this memory? This action cannot be
            undone.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.cancelButton]}
              onPress={() => setDeleteConfirmVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  const renderClearAllConfirmModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={clearAllConfirmVisible}
      onRequestClose={() => setClearAllConfirmVisible(false)}
    >
      <BlurView intensity={30} style={styles.modalContainer}>
        <View style={styles.confirmModal}>
          <View style={styles.confirmContent}>
            <Text style={styles.confirmTitle}>Clear All Memories</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete all your memories? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setClearAllConfirmVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, styles.deleteButton]}
                onPress={handleClearAll}
              >
                <Text style={styles.deleteButtonText}>Clear All</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading transcripts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Memories</Text>
        <View style={styles.headerButtons}>
          {transcripts.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={showClearAllConfirm}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.reloadButton} onPress={onRefresh}>
            <Ionicons name="reload-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {transcripts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="documents-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No memories yet</Text>
          <Text style={styles.emptySubtext}>
            Your recorded memories will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={transcripts}
          renderItem={renderTranscriptItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {renderDetailModal()}
      {renderDeleteConfirmModal()}
      {renderClearAllConfirmModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF1F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  reloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  transcriptCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginLeft: 6,
    fontWeight: "500",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  timeText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  oneLiner: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
  },
  actionContainer: {
    flexDirection: "row",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#FFF",
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F7",
    justifyContent: "center",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  oneLinerText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    lineHeight: 28,
  },
  summaryText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  transcriptText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  confirmModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  confirmModal: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  confirmHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  confirmText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
    padding: 12,
  },
  cancelButton: {
    backgroundColor: "#F5F5F7",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginTop: 20,
  },
  confirmContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
