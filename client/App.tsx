import { ScreenContent } from 'components/ScreenContent';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { RecordButton } from './components/RecordButton';
import { MemoriesScreen } from './components/MemoriesScreen';
import { ProfileScreen } from './components/ProfileScreen';

import './global.css';

const Tab = createBottomTabNavigator();

function HomeScreen() {
  const { isRecording, startRecording, stopRecording, summary, error, uploading } =
    useAudioRecorder();

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-b from-blue-100 to-blue-300 px-4 dark:from-gray-900 dark:to-gray-800">
      {/* Summary Card */}
      <View className="mb-10 mt-8 w-full max-w-xl rounded-2xl border border-blue-200 bg-white/90 p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900/80">
        <Text className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
          Current Task
        </Text>
        <Text className="text-base text-gray-700 dark:text-gray-200">
          {summary || 'No summary yet.'}
        </Text>
      </View>
      {/* Glowing Record Button */}
      <RecordButton isRecording={isRecording} onPress={handleRecordPress} />
      {uploading && (
        <Text className="mt-4 text-base text-blue-500 dark:text-blue-300">Uploading audio...</Text>
      )}
      {error && <Text className="mt-4 text-base text-red-500 dark:text-red-400">{error}</Text>}
      <Text className="mt-6 text-base text-gray-600 dark:text-gray-300">
        {isRecording ? 'Recording...' : 'Tap to start recording'}
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: '#ef4444',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 0.5,
            borderTopColor: '#e5e7eb',
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarIcon: ({ color, size, focused }) => {
            if (route.name === 'Home') {
              return (
                <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
              );
            } else if (route.name === 'Memories') {
              return (
                <MaterialCommunityIcons
                  name={focused ? 'calendar-text' : 'calendar-text-outline'}
                  size={size}
                  color={color}
                />
              );
            } else if (route.name === 'Profile') {
              return (
                <Ionicons
                  name={focused ? 'person-circle' : 'person-circle-outline'}
                  size={size}
                  color={color}
                />
              );
            }
            return null;
          },
        })}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Memories" component={MemoriesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
