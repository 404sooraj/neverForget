import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Transcript {
  _id: string;
  transcript: string;
  summary?: string;
  timestamp: string;
  audioFile: string;
}

export default function SummaryPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const fetchTranscripts = async () => {
    try {
      const response = await fetch('http://192.168.23.94:5000/transcripts');
      if (!response.ok) throw new Error('Failed to fetch transcripts');
      const data = await response.json();
      setTranscripts(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load transcripts');
    }
  };

  const deleteTranscript = async (id: string) => {
    try {
      const response = await fetch(`http://192.168.23.94:5000/transcripts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transcript');
      setTranscripts(transcripts.filter(t => t._id !== id));
      Alert.alert('Success', 'Transcript deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete transcript');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderItem = ({ item }: { item: Transcript }) => (
    <View style={styles.transcriptCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
        <TouchableOpacity onPress={() => deleteTranscript(item._id)}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <Text style={styles.transcriptText}>{item.transcript}</Text>
      {item.summary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Summary:</Text>
          <Text style={styles.summaryText}>{item.summary}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Transcripts</Text>
        <TouchableOpacity 
          style={styles.recordButton}
          onPress={() => router.push('/record')}
        >
          <Ionicons name="mic" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={transcripts}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  recordButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 25,
  },
  listContainer: {
    padding: 20,
  },
  transcriptCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    color: '#666',
    fontSize: 14,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  summaryContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  summaryTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 