import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

/**
 * Returns the list of available TTS voices (iOS / Android).
 * On web, expo-speech does not support voice enumeration.
 */
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  if (Platform.OS === 'web') return [];
  try {
    return await Speech.getAvailableVoicesAsync();
  } catch {
    return [];
  }
}

/**
 * Check whether a given BCP-47 language tag is supported on this device.
 *
 * Strategy:
 * 1. On iOS/Android, query available voices.
 * 2. Fall back to expo-speech's isSpeakingAsync (always available) and assume
 *    support — expo-speech gracefully degrades on unsupported locales.
 */
export async function isLanguageSupported(language: string): Promise<boolean> {
  try {
    const voices = await getAvailableVoices();
    if (voices.length === 0) {
      // No voice list available — optimistically assume supported
      return true;
    }
    const lang = language.toLowerCase();
    return voices.some(
      (v) => v.language?.toLowerCase().startsWith(lang.substring(0, 2))
    );
  } catch {
    return true;
  }
}

export interface SpeakOptions {
  text: string;
  language?: string;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStopped?: () => void;
}

/**
 * Stops any current TTS playback before speaking new text, preventing
 * overlapping audio.
 */
export async function speakText({
  text,
  language = 'en-US',
  rate = 1.0,
  pitch = 1.0,
  onDone,
  onError,
  onStopped,
}: SpeakOptions): Promise<void> {
  // Always stop ongoing speech first
  const isSpeaking = await Speech.isSpeakingAsync();
  if (isSpeaking) {
    await Speech.stop();
  }

  Speech.speak(text, {
    language,
    rate,
    pitch,
    onDone,
    onError,
    onStopped,
  });
}

/**
 * Stops TTS playback immediately.
 */
export async function stopSpeaking(): Promise<void> {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }
  } catch {
    // Ignore — stop can fail if nothing is playing
  }
}

/**
 * Returns whether TTS is currently active.
 */
export async function isTTSSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
