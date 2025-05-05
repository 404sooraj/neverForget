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
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";

type Transcript = {
  _id: string;
  transcript: string;
  timestamp: string;
  summary?: string;
  oneLiner?: string;
  audioFile: string;
  isSummarized: boolean;
  summaryError?: string;
};

export default function SummaryScreen() {
  const { username } = useAuth();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTranscript, setSelectedTranscript] =
    useState<Transcript | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchTranscripts = useCallback(async () => {
    try {
      if (!username) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/transcripts/${username}`
      );
      const data = await response.json();

      if (response.ok) {
        setTranscripts(data || []);
      }
    } catch (error) {
      console.error("Error fetching transcripts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [username]);

  useEffect(() => {
    fetchTranscripts();
  }, [fetchTranscripts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTranscripts();
  }, [fetchTranscripts]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openTranscriptDetail = (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTranscript(null);
  };

  const renderTranscriptItem = ({ item }: { item: Transcript }) => (
    <TouchableOpacity
      style={styles.transcriptCard}
      onPress={() => openTranscriptDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transcriptHeader}>
        <Text style={styles.summaryLabel}>SUMMARY</Text>
        <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
      </View>

      {item.oneLiner ? (
        <Text style={styles.oneLiner} numberOfLines={2}>
          {item.oneLiner}
        </Text>
      ) : item.summary ? (
        <Text style={styles.oneLiner} numberOfLines={2}>
          {item.summary.substring(0, 80)}...
        </Text>
      ) : (
        <Text style={styles.placeholderText}>
          {item.isSummarized && item.summaryError
            ? "Error generating summary"
            : item.isSummarized
            ? "No summary available"
            : "Summary in progress..."}
        </Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.viewMoreText}>Tap to view details</Text>
        <Ionicons name="chevron-forward" size={16} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedTranscript) return null;

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.modalHeaderCenter}>
              <Text style={styles.summaryLabel}>SUMMARY</Text>
              <Text style={styles.dateText}>
                {formatDate(selectedTranscript.timestamp)}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="bookmark-outline" size={24} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="trash-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.summaryTitle}>
              {selectedTranscript.oneLiner || "Untitled Summary"}
            </Text>

            <View style={styles.bulletPoints}>
              <Text style={styles.bulletSectionTitle}>Bullets</Text>
              {selectedTranscript.summary?.split("\n").map((point, index) => (
                <View key={index} style={styles.bulletPoint}>
                  <Text style={styles.bulletText}>• {point.trim()}</Text>
                </View>
              ))}
            </View>

            <View style={styles.detailedSection}>
              <Text style={styles.sectionTitle}>Detailed Summary</Text>
              <Text style={styles.detailedText}>
                {selectedTranscript.summary || "No detailed summary available"}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading transcripts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Summaries</Text>
      {transcripts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transcripts yet</Text>
          <Text style={styles.emptySubtext}>
            Your recorded transcripts will appear here
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  transcriptCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transcriptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666666",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dateText: {
    fontSize: 12,
    color: "#666666",
  },
  oneLiner: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
    lineHeight: 22,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: "#007AFF",
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  backButton: {
    padding: 8,
  },
  modalHeaderCenter: {
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailedSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  detailedText: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 20,
    lineHeight: 32,
  },
  bulletPoints: {
    marginTop: 16,
  },
  bulletSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  bulletPoint: {
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 24,
  },
});
