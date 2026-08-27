/**
 * OnboardingFlow.tsx
 *
 * Issue #483: Onboarding flow for non-crypto mobile users.
 *
 * Acceptance criteria:
 *  ✅ Explains wallet creation and claiming in plain, jargon-free language
 *  ✅ Skippable for returning users (persisted in AsyncStorage)
 *  ✅ Written to be clear to someone with no blockchain background
 *
 * The flow consists of 3 slides:
 *  1. What is Bridgelet?   — plain-language intro, no blockchain terms
 *  2. Your digital wallet  — explains wallet as "a place to hold your money"
 *  3. Claiming a payment   — step-by-step what happens when you tap Claim
 *
 * After completing or skipping, sets a flag in AsyncStorage so the flow
 * is not shown again on subsequent launches.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@bridgelet:onboarding-complete';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingSlide {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

export interface OnboardingFlowProps {
  /** Called when the user completes or skips the onboarding flow. */
  onComplete: () => void;
}

// ─── Slide content ────────────────────────────────────────────────────────────
// Written in plain language, reviewed against the web claim-flow tooltips bar.

const SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    emoji: '👋',
    title: 'Someone sent you money',
    body:
      'You received a payment link from a friend, family member, or organisation. ' +
      'Bridgelet lets you collect that money on your phone in just a few taps — ' +
      'no bank account required.',
  },
  {
    id: 'wallet',
    emoji: '👝',
    title: 'Your personal digital wallet',
    body:
      'We\'ll create a secure wallet for you — think of it like a digital purse ' +
      'that lives on your phone. Only you can access it. ' +
      'We never store your password or hold your money.',
  },
  {
    id: 'claim',
    emoji: '✅',
    title: 'Claiming is easy',
    body:
      'Tap the link you received (or scan the QR code). ' +
      'Confirm you want to claim the funds. ' +
      'The money goes straight into your wallet — usually in under 5 seconds.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Non-fatal — user will see onboarding again next launch
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleComplete = useCallback(async () => {
    await markOnboardingComplete();
    onComplete();
  }, [onComplete]);

  const goToNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      handleComplete();
    }
  }, [currentIndex, handleComplete]);

  const renderSlide: ListRenderItem<OnboardingSlide> = ({ item }) => (
    <View style={styles.slide} testID={`onboarding-slide-${item.id}`}>
      <Text style={styles.emoji} accessibilityElementsHidden>
        {item.emoji}
      </Text>
      <Text style={styles.title} accessibilityRole="header">
        {item.title}
      </Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container} testID="onboarding-screen">
      {/* Skip button — only shown on non-last slides */}
      {!isLast && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleComplete}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          testID="onboarding-skip"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        testID="onboarding-pager"
      />

      {/* Dot indicators */}
      <View style={styles.dots} accessibilityLabel={`Step ${currentIndex + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity }, i === currentIndex && styles.dotActive]}
            />
          );
        })}
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.cta}
        onPress={goToNext}
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'Get started' : 'Next'}
        testID={isLast ? 'onboarding-get-started' : 'onboarding-next'}
      >
        <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Next'}</Text>
      </TouchableOpacity>

      {/* Already have a wallet */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleComplete}
        accessibilityRole="button"
        accessibilityLabel="I already have a wallet"
        testID="onboarding-existing-wallet"
      >
        <Text style={styles.secondaryText}>I already have a wallet</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 32,
    paddingTop: 80,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  dotActive: {
    width: 24,
  },
  cta: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 56,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '500',
  },
});
