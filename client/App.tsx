import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Home',
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="record" 
          options={{ 
            title: 'Record',
            headerShown: true 
          }} 
        />
        <Stack.Screen 
          name="summary" 
          options={{ 
            title: 'Summary',
            headerShown: true 
          }} 
        />
      </Stack>
    </>
  );
} 