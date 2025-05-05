import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useState, useEffect } from "react";
import { format } from "date-fns";

type UserProfile = {
  username: string;
  createdAt: string;
  transcripts: any[];
  email: string;
};

export default function ProfileScreen() {
  const { username } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      if (!username) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/users/${username}`
      );
      const data = await response.json();

      if (response.ok && data.user) {
        setProfile(data.user);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not load profile</Text>
      </View>
    );
  }

  const formattedDate = format(new Date(profile.createdAt), "d MMM, yyyy");

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>{profile.username}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.transcripts.length}</Text>
            <Text style={styles.statLabel}>Transcripts</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formattedDate}</Text>
            <Text style={styles.statLabel}>Member Since</Text>
          </View>
        </View>

        {profile.email && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    color: "#ffffff",
    fontWeight: "600",
  },
  username: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#e1e1e1",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666666",
  },
  infoSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
    textAlign: "center",
  },
});
