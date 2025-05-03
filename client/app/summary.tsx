import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SummaryPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Summary Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 