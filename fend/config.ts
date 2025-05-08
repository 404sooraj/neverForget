import Constants from "expo-constants";

// Try to get the API URL from different possible sources
const getApiUrl = () => {
  // From Expo Config (app.config.js)
  const fromExpoConfig = Constants.expoConfig?.extra?.apiUrl;
  
  // From Expo manifest (for older versions or build contexts)
  const fromManifest = 
    (Constants as any).manifest?.extra?.apiUrl || 
    (Constants as any).manifest2?.extra?.apiUrl;
  
  // Default fallback
  const defaultUrl = "https://neverforget.onrender.com/";
  
  // Use the first non-empty value or default
  const apiUrl = fromExpoConfig || fromManifest || defaultUrl;
  
  console.log("API URL resolved:", apiUrl);
  return apiUrl;
};

// Get the API URL from Expo configuration
export const API_URL = getApiUrl();

// You can add more environment variables here as needed
export const config = {
  apiUrl: API_URL,
};

export default config;
