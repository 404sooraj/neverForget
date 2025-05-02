import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { AppState } from 'react-native';
import { unregisterTaskAsync } from 'expo-task-manager';
import { API_BASE_URL } from '../constants';
const BACKGROUND_RECORD_TASK = 'background-record-task';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const appState = useRef(AppState.currentState);

  // Start recording
  const startRecording = async () => {
    setError(null);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission not granted.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording.');
      console.error('Failed to start recording', err);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    setError(null);
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setIsRecording(false);
        // Optionally, upload the last chunk here
        const uri = recording.getURI();
        if (uri) {
          await uploadAudio(uri, 'manual');
        }
      }
    } catch (err) {
      setError('Failed to stop recording.');
      console.error('Failed to stop recording', err);
    }
  };

  // Upload audio to backend
  const uploadAudio = async (uri: string, eventType: 'interval' | 'appOpen' | 'manual') => {
    setUploading(true);
    setError(null);
    try {
      // Ensure the URI is in the correct format for React Native fetch
      const realUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      const formData = new FormData();
      formData.append('audio', {
        uri: realUri,
        name: `audio-${Date.now()}.m4a`,
        type: 'audio/m4a',
      } as any);
      formData.append('eventType', eventType);
      // Replace with your backend URL
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setError('Failed to upload audio.');
      console.error('Failed to upload audio', err, uri, API_BASE_URL);
    } finally {
      setUploading(false);
    }
  };

  // Background fetch task
  TaskManager.defineTask(BACKGROUND_RECORD_TASK, async () => {
    try {
      if (recording) {
        const uri = recording.getURI();
        if (uri) {
          await uploadAudio(uri, 'interval');
        }
      }
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  // Register background fetch
  useEffect(() => {
    BackgroundFetch.registerTaskAsync(BACKGROUND_RECORD_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    return () => {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_RECORD_TASK);
    };
  }, []);

  // App open event
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        recording
      ) {
        const uri = recording.getURI();
        if (uri) {
          await uploadAudio(uri, 'appOpen');
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [recording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    summary,
    error,
    uploading,
  };
}
