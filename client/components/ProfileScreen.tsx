import { View, Text } from 'react-native';

// Mock user data
const mockUser = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  joined: '2024-01-15',
};

export function ProfileScreen() {
  // Uncomment and use this logic for backend integration
  // const [user, setUser] = useState(null);
  // useEffect(() => {
  //   fetch(`${API_BASE_URL}/profile?userId=...`)
  //     .then(res => res.json())
  //     .then(data => setUser(data));
  // }, []);
  const user = mockUser;

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <View className="w-full max-w-xs rounded-2xl bg-blue-50 p-6 shadow-lg dark:bg-gray-800">
        <Text className="mb-2 text-2xl font-bold text-blue-900 dark:text-blue-100">Profile</Text>
        <Text className="mb-1 text-lg text-gray-800 dark:text-gray-200">Name: {user.name}</Text>
        <Text className="mb-1 text-lg text-gray-800 dark:text-gray-200">Email: {user.email}</Text>
        <Text className="text-lg text-gray-800 dark:text-gray-200">Joined: {user.joined}</Text>
      </View>
    </View>
  );
}
