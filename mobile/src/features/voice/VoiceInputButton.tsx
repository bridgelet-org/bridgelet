import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { VoiceRecordingState } from './types';

interface VoiceInputButtonProps {
  state: VoiceRecordingState;
  isSupported: boolean;
  onPress: () => void;
  /** Interim transcript shown as a live preview while recording */
  interimText?: string;
  size?: number;
}

/**
 * VoiceInputButton
 *
 * A microphone button with animated pulse while recording and a live
 * transcription preview below it.
 */
export function VoiceInputButton({
  state,
  isSupported,
  onPress,
  interimText,
  size = 56,
}: VoiceInputButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Start pulsing ring while recording
  useEffect(() => {
    if (state === 'recording') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }

    return () => {
      pulseLoop.current?.stop();
    };
  }, [state, pulseAnim]);

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isDisabled = !isSupported || isProcessing;

  const buttonColor = isRecording
    ? '#e53935'          // red while recording
    : isProcessing
    ? '#fb8c00'          // amber while processing
    : '#0066cc';         // brand blue at rest

  const accessibilityLabel = isRecording
    ? 'Stop recording'
    : isProcessing
    ? 'Processing speech…'
    : 'Start voice input';

  return (
    <View style={styles.wrapper}>
      {/* Pulse ring (behind the button) */}
      {isRecording && (
        <Animated.View
          style={[
            styles.pulse,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: buttonColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: isDisabled }}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: buttonColor,
            opacity: isDisabled && !isProcessing ? 0.45 : 1,
          },
        ]}
      >
        {isProcessing ? (
          <Text style={[styles.icon, { fontSize: size * 0.38 }]}>⏳</Text>
        ) : (
          <Text style={[styles.icon, { fontSize: size * 0.42 }]}>🎙️</Text>
        )}
      </TouchableOpacity>

      {/* Live transcription preview */}
      {isRecording && interimText ? (
        <View style={styles.interimContainer}>
          <Text style={styles.interimText} numberOfLines={2}>
            {interimText}
          </Text>
        </View>
      ) : null}

      {!isSupported && (
        <Text style={styles.unsupportedLabel}>Voice not supported</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pulse: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.4,
  },
  icon: {
    lineHeight: Platform.OS === 'android' ? undefined : undefined,
  },
  interimContainer: {
    marginTop: 10,
    maxWidth: 260,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interimText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  unsupportedLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#999',
  },
});
