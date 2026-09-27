import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { lookupClaimByToken, ClaimLookupResult } from "../src/claims/service";
import {
  getClaimTokenErrorMessage,
  sanitizeTokenInput,
  validateClaimToken,
} from "../src/claims/token";
import { useThemeColors } from "../src/hooks/useThemeColors";

const summarizeToken = (token: string): string => {
  if (token.length <= 36) return token;
  return `${token.slice(0, 18)}...${token.slice(-12)}`;
};

const createMockTxHash = (seed: string): string => {
  const hex = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64);
  return (hex + "0".repeat(64)).slice(0, 64);
};

export default function ClaimTokenEntryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  useScreenTracking('claim-token-entry');
  const [tokenInput, setTokenInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimLookupResult | null>(null);

  const normalizedToken = useMemo(() => sanitizeTokenInput(tokenInput), [tokenInput]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTokenInput("");
    setErrorMessage(null);
    setResult(null);
    setRefreshing(false);
  };

  const handlePaste = async () => {
    const clipboardValue = await Clipboard.getStringAsync();
    if (!clipboardValue?.trim()) {
      setErrorMessage("Clipboard is empty.");
      return;
    }
    setTokenInput(sanitizeTokenInput(clipboardValue));
    setErrorMessage(null);
    setResult(null);
  };

  const handleLookup = async () => {
    setErrorMessage(null);
    setResult(null);
    try {
      validateClaimToken(normalizedToken);
    } catch (error) {
      setErrorMessage(getClaimTokenErrorMessage(error));
      return;
    }
    setIsLoading(true);
    try {
      const claim = await lookupClaimByToken(normalizedToken);
      setResult(claim);
    } catch (error) {
      setErrorMessage(getClaimTokenErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>Enter Claim Token</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Paste a claim link or enter a claim token manually to verify availability.
        </Text>

        <TextInput
          value={tokenInput}
          onChangeText={setTokenInput}
          style={[styles.tokenInput, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.inputText }]}
          placeholder="Paste token or URL"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={2400}
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.borderAlt }]}
            onPress={handlePaste}
            disabled={isLoading}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Paste from Clipboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleLookup}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>Lookup Claim</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subtext }]}>Verifying claim token...</Text>
          </View>
        )}

        {errorMessage && (
          <Text style={[styles.errorText, { color: colors.errorText, backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
            {errorMessage}
          </Text>
        )}

        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.resultTitle, { color: colors.successText }]}>Claim Found</Text>
            <Text style={[styles.resultRow, { color: colors.text }]}>Account: {result.accountId}</Text>
            <Text style={[styles.resultRow, { color: colors.text }]}>Amount: {result.amount}</Text>
            <Text style={[styles.resultRow, { color: colors.text }]}>Asset: {result.asset}</Text>
            {result.expiresAt ? (
              <Text style={[styles.resultRow, { color: colors.text }]}>Expires: {result.expiresAt}</Text>
            ) : null}
            <Text style={[styles.tokenLabel, { color: colors.subtext }]}>Token</Text>
            <Text selectable style={[styles.tokenPreview, { color: colors.text }]}>
              {summarizeToken(normalizedToken)}
            </Text>
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => {
                const txHash = createMockTxHash(`${result.accountId}:${normalizedToken}`);
                router.push({
                  pathname: "/claim/success",
                  params: { amount: result.amount, asset: result.asset, accountId: result.accountId, txHash },
                });
              }}
            >
              <Text style={styles.claimButtonText}>Complete Claim</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  tokenInput: {
    minHeight: 140,
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: "Courier",
  },
  row: { flexDirection: "row", gap: 8 },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { fontWeight: "600", fontSize: 14 },
  primaryButton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  loadingText: {},
  errorText: { padding: 10, borderRadius: 10, borderWidth: 1 },
  resultCard: { marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  resultTitle: { fontWeight: "700", marginBottom: 2 },
  resultRow: {},
  tokenLabel: { marginTop: 8 },
  tokenPreview: { fontFamily: "Courier" },
  claimButton: { marginTop: 12, borderRadius: 10, backgroundColor: "#16A34A", paddingVertical: 12, alignItems: "center" },
  claimButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
