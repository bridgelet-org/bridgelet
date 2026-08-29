import { useState, useCallback, useEffect, useRef } from 'react';
import {
  VoiceRecordingState,
  VoiceError,
  UseVoiceInputOptions,
  TranscriptionResult,
} from './types';
import { requestMicrophonePermission } from './permissions';
import {
  isSpeechRecognitionSupported,
  startTranscription,
  stopTranscription,
  abortTranscription,
  mapSpeechError,
  parseTranscriptionResult,
  useSpeechRecognitionEvent,
} from './speechRecognition';

export interface UseVoiceInputReturn {
  /** Current state of the voice recording pipeline */
  state: VoiceRecordingState;
  /** Whether the device supports speech recognition */
  isSupported: boolean;
  /** Interim transcription text shown while recording */
  interimText: string;
  /** Start recording. Requests permission if needed. */
  startRecording: () => Promise<void>;
  /** Stop recording and trigger transcription */
  stopRecording: () => Promise<void>;
  /** Cancel recording without emitting a result */
  cancelRecording: () => Promise<void>;
  /** Last error, if any */
  error: VoiceError | null;
  /** Clear the last error */
  clearError: () => void;
}

/**
 * useVoiceInput
 *
 * Manages the full lifecycle of voice-to-text input:
 * 1. Requests microphone permission on first use
 * 2. Starts / stops speech recognition
 * 3. Surfaces interim results for real-time feedback
 * 4. Calls `onTranscription` with the final result
 * 5. Handles all errors gracefully
 */
export function useVoiceInput({
  locale = 'en-US',
  onTranscription,
  onError,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceRecordingState>('idle');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);

  // Track whether a session is active so event handlers can guard stale calls
  const isActiveRef = useRef(false);

  const isSupported = isSpeechRecognitionSupported();

  // ─── Speech recognition event listeners ────────────────────────────────────

  // Interim results (streaming feedback while speaking)
  useSpeechRecognitionEvent?.('result', (event: any) => {
    if (!isActiveRef.current) return;
    const parsed = parseTranscriptionResult(event);
    if (parsed) {
      setInterimText(parsed.text);
    }
  });

  // Final result — recognition session ended naturally
  useSpeechRecognitionEvent?.('end', (event: any) => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;

    const parsed = parseTranscriptionResult(event);
    if (parsed && parsed.text) {
      setState('done');
      setInterimText('');
      onTranscription(parsed);
    } else {
      // 'end' fired with no usable text — treat as a silent no-op
      setState('idle');
      setInterimText('');
    }
  });

  // Error from the native recognition engine
  useSpeechRecognitionEvent?.('error', (event: any) => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;

    const voiceError = mapSpeechError(event?.error ?? 'unknown', event?.message);
    setError(voiceError);
    setState('error');
    setInterimText('');
    onError?.(voiceError);
  });

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleError = useCallback(
    (err: VoiceError) => {
      setError(err);
      setState('error');
      onError?.(err);
    },
    [onError]
  );

  const startRecording = useCallback(async () => {
    if (state === 'recording' || state === 'processing') return;

    setError(null);
    setInterimText('');

    // 1. Check support
    if (!isSupported) {
      handleError({
        code: 'NOT_SUPPORTED',
        message: 'Speech recognition is not available on this device.',
      });
      return;
    }

    // 2. Request permission
    const { granted, error: permError } = await requestMicrophonePermission();
    if (!granted) {
      handleError(permError!);
      return;
    }

    // 3. Start recognition
    setState('recording');
    isActiveRef.current = true;

    const startError = await startTranscription(locale);
    if (startError) {
      isActiveRef.current = false;
      handleError(startError);
      setState('idle');
    }
  }, [state, isSupported, locale, handleError]);

  const stopRecording = useCallback(async () => {
    if (state !== 'recording') return;
    setState('processing');
    // stopTranscription signals the native engine to finalise; the 'end' event
    // will fire with the transcription result.
    await stopTranscription();
  }, [state]);

  const cancelRecording = useCallback(async () => {
    if (state !== 'recording' && state !== 'processing') return;
    isActiveRef.current = false;
    await abortTranscription();
    setState('idle');
    setInterimText('');
  }, [state]);

  const clearError = useCallback(() => {
    setError(null);
    if (state === 'error') setState('idle');
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        abortTranscription();
      }
    };
  }, []);

  return {
    state,
    isSupported,
    interimText,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
    clearError,
  };
}
