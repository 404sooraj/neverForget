// config.ts
import Constants from "expo-constants";

// Get API URL from Expo config which reads from environment variables
const API_URL_FROM_CONFIG = Constants.expoConfig?.extra?.apiUrl ||
  (Constants as any).manifest?.extra?.apiUrl || 
  (Constants as any).manifest2?.extra?.apiUrl;

// Use the environment variable or fall back to the default URL if not set
export const API_URL: string = API_URL_FROM_CONFIG || "https://neverforget.onrender.com/";

// Log the API URL being used
console.log("API URL:", API_URL);
