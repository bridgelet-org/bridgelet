import { useState, useCallback, useEffect } from 'react';

export function useNfc() {
  const [isSupported, setIsSupported] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only check for NDEFReader on the client side
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setIsSupported(true);
    }
  }, []);

  const writeUrl = useCallback(
    async (url: string) => {
      if (!isSupported) {
        setError('Web NFC is not supported on this device or browser. Use Android Chrome.');
        return false;
      }

      setIsWriting(true);
      setError(null);

      try {
        // @ts-ignore - Web NFC is not yet in standard TS dom lib
        const ndef = new window.NDEFReader();

        // Request permission and start scanning for a tag
        await ndef.write({
          records: [{ recordType: 'url', data: url }],
        });

        setIsWriting(false);
        return true;
      } catch (err: any) {
        setError(
          err.message ||
            'Failed to write to NFC tag. The user may have aborted the request or the tag is incompatible.',
        );
        setIsWriting(false);
        return false;
      }
    },
    [isSupported],
  );

  return { isSupported, writeUrl, isWriting, error };
}
