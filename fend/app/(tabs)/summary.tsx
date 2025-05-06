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
import * as Speech from 'expo-speech';
import { BlurView } from "expo-blur";
import { format } from "date-fns";

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
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const fetchTranscripts = useCallback(async () => {
    try {
      if (!username) {
        console.log("No username available");
        return;
      }

      console.log("Fetching transcripts for username:", username);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/transcripts/${username}`
      );
      const data = await response.json();
      console.log("API Response:", data);

      if (response.ok) {
        console.log("Setting transcripts:", data);
        setTranscripts(data || []);
        if (selectedTranscript) {
          const updatedTranscript = data.find((t: Transcript) => t._id === selectedTranscript._id);
          if (updatedTranscript) {
            setSelectedTranscript(updatedTranscript);
          }
        }
      } else {
        console.error("API error:", data);
      }
    } catch (error) {
      console.error("Error fetching transcripts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [username, selectedTranscript]);

  useEffect(() => {
    console.log("Initial fetch triggered");
    fetchTranscripts();
  }, [fetchTranscripts]);

  // Add animation effect when transcripts are loaded
  useEffect(() => {
    console.log("Current transcripts:", transcripts);
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
        `${process.env.EXPO_PUBLIC_API_URL}/transcripts/${selectedTranscript._id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        }
      );

      if (response.ok) {
        setTranscripts(prev => prev.filter(t => t._id !== selectedTranscript._id));
        setDeleteConfirmVisible(false);
        setModalVisible(false);
        setSelectedTranscript(null);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to delete transcript');
      }
    } catch (error) {
      console.error('Error deleting transcript:', error);
      Alert.alert('Error', 'Failed to delete transcript');
    }
  };

  const showDeleteConfirm = () => {
    setDeleteConfirmVisible(true);
  };

  const handleRefreshSummary = async () => {
    if (!selectedTranscript) return;
    
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/transcripts/${username}`
      );
      const data = await response.json();

      if (response.ok) {
        const updatedTranscript = data.find((t: Transcript) => t._id === selectedTranscript._id);
        if (updatedTranscript) {
          setSelectedTranscript(updatedTranscript);
          setTranscripts(prev => 
            prev.map(t => t._id === updatedTranscript._id ? updatedTranscript : t)
          );
        }
      }
    } catch (error) {
      console.error("Error refreshing summary:", error);
      Alert.alert('Error', 'Failed to refresh summary');
    }
  };

  const handleShare = async () => {
    if (!selectedTranscript) return;

    try {
      // Prepare the share content
      let shareContent = '';

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
        title: 'Never Forget - Memory Summary',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share summary');
    }
  };

  const renderTranscriptItem = ({ item, index }: { item: Transcript; index: number }) => {
    console.log("Rendering transcript item:", item);
    const formattedDate = (() => {
      try {
        const date = new Date(item.createdAt || item.timestamp);
        if (isNaN(date.getTime())) {
          console.warn("Invalid date for transcript:", item._id);
          return "Invalid date";
        }
        return format(date, "MMMM d, yyyy");
      } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid date";
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
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: item.summary ? "#4CAF50" : "#FFC107" }]} />
              <Text style={styles.statusText}>{item.summary ? "Completed" : "Processing"}</Text>
            </View>
          </View>
          
          <Text style={styles.oneLiner} numberOfLines={2}>
            {item.oneLiner || item.summary?.substring(0, 100) || "Processing your memory..."}
          </Text>
          
          <View style={styles.cardFooter}>
            <View style={styles.statsContainer}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.statsText}>
                {item.duration ? `${Math.floor(item.duration / 60)}m ${Math.floor(item.duration % 60)}s` : "N/A"}
              </Text>
            </View>
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
            language: 'en',
            rate: 0.9,
            pitch: 1.0,
          });
        }
      } catch (error) {
        console.error('Error with text-to-speech:', error);
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
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
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
            Are you sure you want to delete this memory? This action cannot be undone.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.cancelButton]}
              onPress={() => setDeleteConfirmVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.deleteConfirmButton]}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
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
        <TouchableOpacity style={styles.reloadButton} onPress={onRefresh}>
          <Ionicons name="reload-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
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
  },
  dateText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
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
    marginBottom: 12,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
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
    backgroundColor: "#FFF1F0",
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
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#F5F5F7",
  },
  deleteConfirmButton: {
    backgroundColor: "#FF3B30",
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
});
