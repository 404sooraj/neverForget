import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Keyboard,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatbotScreen() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content:
        "Hi there! I can help you recall your past conversations. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const { username } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const screenHeight = Dimensions.get("window").height;

  // Load saved conversations when component mounts
  useEffect(() => {
    loadConversation();

    // Set up keyboard listeners
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Save conversations whenever messages change
  useEffect(() => {
    if (messages.length > 1) {
      // Don't save if it's just the welcome message
      saveConversation();
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change or keyboard changes
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, keyboardHeight]);

  // Load saved conversation from storage
  const loadConversation = async () => {
    if (!username) return;

    try {
      const savedConversation = await AsyncStorage.getItem(
        `chat_history_${username}`
      );
      if (savedConversation) {
        const parsedMessages = JSON.parse(savedConversation) as ChatMessage[];

        // Convert string timestamps back to Date objects
        const processedMessages = parsedMessages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));

        setMessages(processedMessages);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  // Save conversation to storage
  const saveConversation = async () => {
    if (!username) return;

    try {
      await AsyncStorage.setItem(
        `chat_history_${username}`,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  const handleSendQuery = async () => {
    if (!query.trim()) return;

    // Add user message to the chat
    const userMessageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: userMessageId,
      content: query.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      // Send request to the memory chatbot endpoint
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/chatbot/memory`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            query: userMessage.content,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get a response");
      }

      // Add chatbot response to the chat
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error getting chatbot response:", error);
      Alert.alert(
        "Error",
        "Failed to get a response from the memory assistant."
      );

      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "Sorry, I'm having trouble accessing your memories right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Function to clear conversation history
  const handleClearHistory = () => {
    Alert.alert(
      "Clear Conversation",
      "Are you sure you want to clear your conversation history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              if (username) {
                await AsyncStorage.removeItem(`chat_history_${username}`);
                setMessages([
                  {
                    id: "welcome",
                    content:
                      "Hi there! I can help you recall your past conversations. What would you like to know?",
                    isUser: false,
                    timestamp: new Date(),
                  },
                ]);
              }
            } catch (error) {
              console.error("Error clearing conversation history:", error);
              Alert.alert("Error", "Failed to clear conversation history");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Memory Assistant</Text>
          {messages.length > 1 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearHistory}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.isUser
                  ? styles.userMessageWrapper
                  : styles.botMessageWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userMessage : styles.botMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser
                      ? styles.userMessageText
                      : styles.botMessageText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
              <Text
                style={[
                  styles.timestampText,
                  message.isUser
                    ? styles.userTimestampText
                    : styles.botTimestampText,
                ]}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Searching memories...</Text>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Platform.OS === "ios" ? 0 : 8 },
          ]}
        >
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Ask about your past conversations..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            onSubmitEditing={Keyboard.dismiss}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !query.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendQuery}
            disabled={!query.trim() || loading}
          >
            <Ionicons
              name="send"
              size={24}
              color={query.trim() && !loading ? "#007AFF" : "#CCC"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E6EB",
    position: "relative", // For absolute positioning of clear button
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1E21",
  },
  clearButton: {
    position: "absolute",
    right: 16,
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesList: {
    paddingVertical: 16,
  },
  messageWrapper: {
    marginBottom: 12,
    flexDirection: "column",
    width: "100%",
  },
  userMessageWrapper: {
    alignItems: "flex-end",
  },
  botMessageWrapper: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  userMessage: {
    backgroundColor: "#007AFF",
  },
  botMessage: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E6EB",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  botMessageText: {
    color: "#1C1E21",
  },
  timestampText: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  userTimestampText: {
    color: "#B0B0B0",
    textAlign: "right",
  },
  botTimestampText: {
    color: "#B0B0B0",
    textAlign: "left",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 12,
    backgroundColor: "#F2F3F5",
    borderRadius: 18,
    marginVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#65676B",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E4E6EB",
    backgroundColor: "#F8F9FA",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E4E6EB",
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
