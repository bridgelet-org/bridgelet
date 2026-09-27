import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { SenderFlow } from '../src/sender/SenderFlow';

export default function CreateTransferScreen() {
  useScreenTracking('send-create');

  return (
    <SafeAreaView style={styles.container}>
      <SenderFlow />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
