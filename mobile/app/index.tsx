import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { secureStorage } from './src/utils/storage';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useScreenTracking } from './src/hooks/useScreenTracking';

export default function HomeIndex() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const colors = useThemeColors();
  useScreenTracking('home');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const status = await secureStorage.getItem("has_onboarded");
      setHasOnboarded(status === "true");
    };
    checkOnboardingStatus();
  }, []);

  if (hasOnboarded === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/send" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
