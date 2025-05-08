import "dotenv/config";

// Log the environment variable for debugging
console.log("API URL from env:", process.env.EXPO_PUBLIC_API_URL);

// Check if the API URL is defined
if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn("⚠️ EXPO_PUBLIC_API_URL is not defined in .env file. Using default fallback URL.");
}

export default {
  expo: {
    name: "NeverForget",
    slug: "neverforget",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "neverforget",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      permissions: ["android.permission.RECORD_AUDIO"],
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.sooraj002.neverforget"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: "889dbfd5-d84c-43cf-90a9-d18517c0d1be"
      },
    },
    owner: "sooraj002", // Add the owner field with your Expo username
  },
};
