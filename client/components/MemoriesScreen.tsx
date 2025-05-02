import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';

// Mock data for Memories
const mockMemories = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  return {
    date: date.toISOString().slice(0, 10),
    parts: {
      Morning: `Morning summary for ${date.toDateString()}`,
      Afternoon: `Afternoon summary for ${date.toDateString()}`,
      Evening: `Evening summary for ${date.toDateString()}`,
      Night: `Night summary for ${date.toDateString()}`,
    },
  };
});

export function MemoriesScreen() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening' | 'Night'>(
    'All'
  );

  // Uncomment and use this logic for backend integration
  // useEffect(() => {
  //   fetch(`${API_BASE_URL}/memories?userId=...`)
  //     .then(res => res.json())
  //     .then(data => setMemories(data));
  // }, []);

  const memories = mockMemories;
  const selectedMemory = memories.find((m) => m.date === selectedDay);

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Text className="mb-2 mt-6 text-center text-2xl font-bold">Memories</Text>
      {!selectedDay ? (
        <ScrollView className="px-4">
          {memories.map((m) => (
            <Pressable
              key={m.date}
              className="mb-3 rounded-xl bg-blue-50 p-4 dark:bg-gray-800"
              onPress={() => setSelectedDay(m.date)}>
              <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {m.date}
              </Text>
              <Text className="text-gray-600 dark:text-gray-300" numberOfLines={1}>
                {Object.values(m.parts).join(' | ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4">
          <TouchableOpacity className="mb-4 mt-2" onPress={() => setSelectedDay(null)}>
            <Text className="text-blue-500">&larr; Back to days</Text>
          </TouchableOpacity>
          <Text className="mb-2 text-xl font-bold">{selectedDay}</Text>
          {/* Filter */}
          <View className="mb-4 flex-row">
            {['All', 'Morning', 'Afternoon', 'Evening', 'Night'].map((part) => (
              <TouchableOpacity
                key={part}
                className={`mr-2 rounded-full px-3 py-1 ${filter === part ? 'bg-blue-500' : 'bg-gray-200'}`}
                onPress={() => setFilter(part as any)}>
                <Text className={filter === part ? 'text-white' : 'text-gray-700'}>{part}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView>
            {(filter === 'All'
              ? Object.entries(selectedMemory?.parts ?? {})
              : Object.entries(selectedMemory?.parts ?? {}).filter(([k]) => k === filter)
            ).map(([part, summary]) => (
              <View key={part} className="mb-4 rounded-lg bg-blue-100 p-4 dark:bg-gray-700">
                <Text className="mb-1 font-semibold">{part}</Text>
                <Text className="text-gray-700 dark:text-gray-200">{summary}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
