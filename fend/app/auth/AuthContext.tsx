// client/app/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import axiosInstance from "../../services/api";
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
      const response = await axiosInstance.get(`/user/${username}`);
      console.log(response)
      await AsyncStorage.setItem("username", username);
      setUsername(username);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to sign in";
      throw new Error(errorMessage);
    }
  };

  const signUp = async (username: string) => {
    try {
      const response = await axiosInstance.post("/user", { username });
      console.log(response)
      await AsyncStorage.setItem("username", username);
      setUsername(username);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to sign up";
      throw new Error(errorMessage);
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
