import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { secureStorage } from '../src/utils/storage';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useScreenTracking } from '../src/hooks/useScreenTracking';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const ONBOARDING_DATA: OnboardingSlide[] = [
  { id: '1', title: 'Welcome to Bridgelet', description: "The easiest way to send and claim crypto, even without a wallet.", icon: '👋', color: '#3B82F6' },
  { id: '2', title: 'Ephemeral Accounts', description: "We create secure, single-use accounts that hold your funds until you're ready.", icon: '⏳', color: '#8B5CF6' },
  { id: '3', title: 'Walletless Claiming', description: 'No seed phrases or complicated setup. Claim your funds with just a few taps.', icon: '🚀', color: '#10B981' },
  { id: '4', title: 'Secure Transfer', description: 'Once claimed, your funds are automatically moved to your permanent wallet.', icon: '🛡️', color: '#F59E0B' },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const flatListRef = React.useRef<FlatList>(null);
  const router = useRouter();
  const colors = useThemeColors();
  useScreenTracking('onboarding');

  const handleSkip = async () => {
    await secureStorage.setItem('has_onboarded', 'true');
    router.replace('/');
  };

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await secureStorage.setItem('has_onboarded', 'true');
      router.replace('/');
    }
  };

  const onScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const renderItem = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.iconText}>{item.icon}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.description, { color: colors.subtext }]}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.subtext }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(item) => item.id}
        scrollEventThrottle={16}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                { backgroundColor: colors.border },
                currentIndex === index && { width: 24, backgroundColor: ONBOARDING_DATA[index].color },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: ONBOARDING_DATA[currentIndex].color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20 },
  skipText: { fontSize: 16, fontWeight: '600' },
  slide: { width, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  iconContainer: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  iconText: { fontSize: 60 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  description: { fontSize: 18, textAlign: 'center', lineHeight: 28 },
  footer: { paddingHorizontal: 40, paddingBottom: 40 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  nextButton: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  nextButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
