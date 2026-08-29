import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import { useAudioPlayback } from '../features/audio/useAudioPlayback';
import { AudioPlaybackState } from '../features/audio/types';

export interface TranslationResultProps {
  /** The translated text to display and optionally speak */
  translatedText: string;
  /** The target language code used for both display and TTS, e.g. 'fr-FR' */
  targetLanguage: string;
  /** Human-readable language name for display, e.g. 'French' */
  targetLanguageName?: string;
  /** Source language name for context display */
  sourceLanguageName?: string;
  /** Show audio playback controls (default: true) */
  showAudioControls?: boolean;
  /** Optional style overrides for the outer container */
  style?: any;
}

/**
 * TranslationResult
 *
 * Renders a translated text card with:
 * - The translated output text
 * - Language pair label
 * - Play / Stop button for native TTS audio playback
 * - Loading and error states
 * - "Language not supported" warning when TTS cannot honour the target locale
 */
export function TranslationResult({
  translatedText,
  targetLanguage,
  targetLanguageName,
  sourceLanguageName,
  showAudioControls = true,
  style,
}: TranslationResultProps) {
  const { state, play, stop, error, clearError, isLanguageSupported } =
    useAudioPlayback({
      text: translatedText,
      language: targetLanguage,
    });

  const handlePlaybackToggle = useCallback(() => {
    if (state === 'playing') {
      stop();
    } else {
      clearError();
      play();
    }
  }, [state, play, stop, clearError]);

  if (!translatedText) return null;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.languageLabel}>
          {sourceLanguageName
            ? `${sourceLanguageName} → ${targetLanguageName ?? targetLanguage}`
            : targetLanguageName ?? targetLanguage}
        </Text>

        {showAudioControls && (
          <PlaybackButton
            state={state}
            isLanguageSupported={isLanguageSupported}
            onPress={handlePlaybackToggle}
          />
        )}
      </View>

      {/* Translated text */}
      <Text
        style={styles.translatedText}
        accessibilityLabel={`Translation: ${translatedText}`}
        selectable
      >
        {translatedText}
      </Text>

      {/* Language not supported warning */}
      {showAudioControls && !isLanguageSupported && (
        <Text style={styles.warningText}>
          ⚠️ Audio playback may not be available for this language on your device.
        </Text>
      )}

      {/* Playback error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity onPress={clearError} accessibilityLabel="Dismiss error">
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Internal PlaybackButton sub-component ─────────────────────────────────

interface PlaybackButtonProps {
  state: AudioPlaybackState;
  isLanguageSupported: boolean;
  onPress: () => void;
}

function PlaybackButton({ state, isLanguageSupported, onPress }: PlaybackButtonProps) {
  const isLoading = state === 'loading';
  const isPlaying = state === 'playing';

  const label = isPlaying ? 'Stop audio' : isLoading ? 'Loading audio…' : 'Play translation';
  const icon = isPlaying ? '⏹' : '▶️';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isLoading }}
      style={[
        styles.playButton,
        isPlaying && styles.playButtonActive,
        !isLanguageSupported && styles.playButtonWarn,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.playButtonIcon}>{icon}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dde3f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  languageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066cc',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  translatedText: {
    fontSize: 17,
    color: '#1a1a2e',
    lineHeight: 26,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0066cc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    elevation: 2,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  playButtonActive: {
    backgroundColor: '#e53935',
    shadowColor: '#e53935',
  },
  playButtonWarn: {
    backgroundColor: '#fb8c00',
    shadowColor: '#fb8c00',
  },
  playButtonIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  warningText: {
    marginTop: 8,
    fontSize: 12,
    color: '#e65100',
  },
  errorContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3f3',
    borderRadius: 6,
    padding: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#c62828',
  },
  errorDismiss: {
    fontSize: 14,
    color: '#c62828',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});
