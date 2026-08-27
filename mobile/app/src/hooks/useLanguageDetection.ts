import { useState, useEffect, useRef, useCallback } from 'react';
import { languageDetectionService, LanguageDetectionResult } from '../features/translate/languageDetection';

/**
 * Hook for real-time language detection with debouncing
 * @param text - Input text to detect language from
 * @param onLanguageChange - Callback when detected language changes
 */
export function useLanguageDetection(
  text: string,
  onLanguageChange?: (language: string, confidence: number) => void
) {
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [alternatives, setAlternatives] = useState<LanguageDetectionResult['alternatives']>([]);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTextRef = useRef<string>('');

  /**
   * Perform language detection
   */
  const detectLanguage = useCallback(async (textToDetect: string) => {
    if (!textToDetect.trim()) {
      setDetectedLanguage('');
      setConfidence(0);
      setAlternatives([]);
      return;
    }

    if (textToDetect === lastTextRef.current) {
      return; // Skip detection if text hasn't changed
    }

    lastTextRef.current = textToDetect;
    setIsDetecting(true);

    try {
      const result = await languageDetectionService.detectLanguage(textToDetect);
      
      setDetectedLanguage(result.detectedLanguage);
      setConfidence(result.confidence);
      setAlternatives(result.alternatives || []);

      // Call the callback if provided
      if (onLanguageChange) {
        onLanguageChange(result.detectedLanguage, result.confidence);
      }
    } catch (error) {
      console.error('[useLanguageDetection] Error:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [onLanguageChange]);

  /**
   * Debounced detection effect
   */
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip detection if text is very short (< 3 characters)
    if (!text || text.length < 3) {
      setDetectedLanguage('');
      setConfidence(0);
      setAlternatives([]);
      lastTextRef.current = '';
      return;
    }

    // Skip detection if same text
    if (text === lastTextRef.current) {
      return;
    }

    // Set up debounced detection
    debounceTimerRef.current = setTimeout(() => {
      detectLanguage(text);
    }, 300); // 300ms debounce

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [text, detectLanguage]);

  /**
   * Function to override detected language manually
   */
  const overrideLanguage = useCallback((language: string) => {
    setDetectedLanguage(language);
    if (onLanguageChange) {
      onLanguageChange(language, 1.0); // Full confidence when manually selected
    }
  }, [onLanguageChange]);

  /**
   * Function to reset detection
   */
  const reset = useCallback(() => {
    languageDetectionService.reset();
    setDetectedLanguage('');
    setConfidence(0);
    setAlternatives([]);
    lastTextRef.current = '';
  }, []);

  return {
    detectedLanguage,
    confidence,
    isDetecting,
    alternatives,
    overrideLanguage,
    reset,
  };
}
