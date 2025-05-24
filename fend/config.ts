import Constants from "expo-constants";

// Get the API URL from Expo configuration
export const API_URL = Constants.expoConfig?.extra?.apiUrl;

if (!API_URL) {
  console.error("API URL is not configured properly in app.config.js");
}

// You can add more environment variables here as needed
export const config = {
  apiUrl: API_URL,
};

export default config;
