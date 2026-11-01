import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { track } from "../analytics/analytics";
import { sanitizeTokenInput, validateClaimToken } from "../claims/token";
import { useThemeColors } from "../hooks/useThemeColors";

export interface QRCodeScannerProps {
  onScanSuccess?: (token: string) => void;
  onScanError?: (error: Error) => void;
}

/**
 * Extracts a claim token from a raw scanned QR payload,
 * which may be a raw token, a web URL (`https://.../claim/<token>`),
 * or a deep link (`bridgelet://claim/<token>`).
 */
export function extractClaimTokenFromQR(data: string): string | null {
  if (!data || typeof data !== "string") return null;
  const trimmed = data.trim();

  // URL extraction
  if (trimmed.includes("/claim/")) {
    const parts = trimmed.split("/claim/");
    const tokenPart = parts[1]?.split("?")[0]?.split("#")[0]?.trim();
    if (tokenPart) return sanitizeTokenInput(tokenPart);
  }

  // Deep-link schema: bridgelet://claim?token=<token>
  if (trimmed.includes("token=")) {
    const match = trimmed.match(/[?&]token=([^&#]+)/);
    if (match?.[1]) return sanitizeTokenInput(decodeURIComponent(match[1]));
  }

  // Direct raw token fallback
  return sanitizeTokenInput(trimmed);
}

export function QRCodeScanner({ onScanSuccess, onScanError }: QRCodeScannerProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleScannedData = useCallback(
    (rawData: string) => {
      setErrorMessage(null);
      const token = extractClaimTokenFromQR(rawData);
      if (!token) {
        const err = new Error("Invalid QR code: no claim token found");
        setErrorMessage(err.message);
        onScanError?.(err);
        return;
      }

      try {
        validateClaimToken(token);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Invalid claim token");
        setErrorMessage(error.message);
        onScanError?.(error);
        return;
      }

      setIsProcessing(true);

      // Instrument QR code entry channel (§5.1, §8.2)
      track({
        name: "Claim Page Opened",
        params: {
          claim_id: token,
          entry_channel: "qr_code",
        },
      });

      onScanSuccess?.(token);
      router.push({
        pathname: "/claim",
        params: { token, channel: "qr_code" },
      });
    },
    [router, onScanSuccess, onScanError]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.viewfinder}>
        <Text style={[styles.instruction, { color: colors.text }]}>
          Scan recipient claim QR code
        </Text>
        <View style={[styles.scannerBox, { borderColor: colors.primary }]}>
          {isProcessing ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={[styles.scannerPlaceholder, { color: colors.subtext }]}>
              Position QR code within frame
            </Text>
          )}
        </View>
      </View>

      {errorMessage && (
        <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
      )}

      <View style={styles.manualEntry}>
        <Text style={[styles.manualLabel, { color: colors.subtext }]}>
          Or simulate QR code payload:
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder="Paste QR payload / claim URL"
          placeholderTextColor={colors.subtext}
          value={manualInput}
          onChangeText={setManualInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={() => handleScannedData(manualInput)}
          disabled={!manualInput.trim() || isProcessing}
        >
          <Text style={styles.submitText}>Process QR Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  viewfinder: {
    alignItems: "center",
    marginTop: 24,
  },
  instruction: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderRadius: 16,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerPlaceholder: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 8,
  },
  manualEntry: {
    marginTop: 24,
    marginBottom: 16,
  },
  manualLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default QRCodeScanner;
