import { TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type RecordButtonProps = {
  isRecording: boolean;
  onPress: () => void;
};

export function RecordButton({ isRecording, onPress }: RecordButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className="items-center justify-center w-32 h-32 rounded-full bg-red-500 shadow-2xl border-4 border-red-300"
      style={{ shadowColor: '#f87171', shadowOpacity: 0.7, shadowRadius: 30, elevation: 20 }}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={isRecording ? 'microphone' : 'microphone-off'} size={64} color="#fff" />
    </TouchableOpacity>
  );
}
