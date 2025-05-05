// client/app/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthContextType = {
  username: string | null;
  isLoading: boolean;
  signIn: (username: string) => Promise<void>;
  signUp: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored username on app load
    loadStoredUsername();
  }, []);

  async function loadStoredUsername() {
    try {
      const storedUsername = await AsyncStorage.getItem("username");
      if (storedUsername) {
        setUsername(storedUsername);
      }
    } catch (error) {
      console.error("Error loading stored username:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (username: string) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/users/${username}`
      );
      const data = await response.json();
      console.log(data);
      if (!response.ok) {
        throw new Error("User not found");
      }
      await AsyncStorage.setItem("username", username);
      setUsername(username);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (username: string) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Username already exists");
      }

      await AsyncStorage.setItem("username", username);
      setUsername(username);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem("username");
      setUsername(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ username, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
