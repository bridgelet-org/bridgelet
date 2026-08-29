import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AudioPlaybackState,
  AudioPlaybackError,
  UseAudioPlaybackOptions,
  UseAudioPlaybackReturn,
} from './types';
import { speakText, stopSpeaking, isLanguageSupported } from './ttsService';

/**
 * useAudioPlayback
 *
 * Provides play / stop controls for text-to-speech output.
 *
 * Key guarantees:
 * - Only one utterance plays at a time (no overlapping audio)
 * - Consecutive taps on "play" restart cleanly
 * - Cleans up on component unmount
 * - Exposes language-support check so the UI can inform the user
 */
export function useAudioPlayback({
  text,
  language = 'en-US',
  rate = 1.0,
  pitch = 1.0,
}: UseAudioPlaybackOptions): UseAudioPlaybackReturn {
  const [state, setState] = useState<AudioPlaybackState>('idle');
  const [error, setError] = useState<AudioPlaybackError | null>(null);
  const [isLangSupported, setIsLangSupported] = useState(true);

  // Track whether this hook instance is still mounted
  const mountedRef = useRef(true);

  // Check language support whenever the language prop changes
  useEffect(() => {
    let cancelled = false;
    isLanguageSupported(language).then((supported) => {
      if (!cancelled && mountedRef.current) setIsLangSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopSpeaking();
    };
  }, []);

  const play = useCallback(async () => {
    if (!text?.trim()) return;

    setError(null);
    setState('loading');

    try {
      await speakText({
        text,
        language,
        rate,
        pitch,
        onDone: () => {
          if (mountedRef.current) setState('idle');
        },
        onStopped: () => {
          if (mountedRef.current) setState('idle');
        },
        onError: (err) => {
          if (!mountedRef.current) return;
          setError({
            code: 'PLAYBACK_FAILED',
            message: err?.message ?? 'Audio playback failed.',
          });
          setState('error');
        },
      });

      if (mountedRef.current) setState('playing');
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError({
        code: 'PLAYBACK_FAILED',
        message: err?.message ?? 'An unexpected error occurred during playback.',
      });
      setState('error');
    }
  }, [text, language, rate, pitch]);

  const stop = useCallback(() => {
    stopSpeaking();
    if (mountedRef.current) setState('idle');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (state === 'error') setState('idle');
  }, [state]);

  return {
    state,
    play,
    stop,
    error,
    clearError,
    isLanguageSupported: isLangSupported,
  };
}
