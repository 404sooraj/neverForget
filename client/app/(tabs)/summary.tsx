import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useState, useEffect, useCallback } from "react";

type Transcript = {
  _id: string;
  transcript: string;
  timestamp: string;
  summary?: string;
  audioFile: string;
};

export default function SummaryScreen() {
  const { username } = useAuth();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTranscripts = useCallback(async () => {
    try {
      if (!username) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/users/${username}/transcripts`
      );
      const data = await response.json();

      if (response.ok) {
        setTranscripts(data.transcripts || []);
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

  const renderTranscriptItem = ({ item }: { item: Transcript }) => (
    <View style={styles.transcriptCard}>
      <View style={styles.transcriptHeader}>
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.audioFile}>{item.audioFile}</Text>
      </View>

      <Text style={styles.transcriptText} numberOfLines={3}>
        {item.transcript}
      </Text>

      {item.summary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Summary:</Text>
          <Text style={styles.summaryText} numberOfLines={2}>
            {item.summary}
          </Text>
        </View>
      )}
    </View>
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
      <Text style={styles.title}>Your Transcripts</Text>
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
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 14,
    color: "#666666",
  },
  audioFile: {
    fontSize: 12,
    color: "#007AFF",
  },
  transcriptText: {
    fontSize: 16,
    color: "#1a1a1a",
    lineHeight: 22,
  },
  summaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: "#1a1a1a",
    lineHeight: 20,
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
});
