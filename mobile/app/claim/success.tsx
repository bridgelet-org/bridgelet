import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Linking,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useScreenTracking } from '../src/hooks/useScreenTracking';

const readParam = (value: string | string[] | undefined, fallback = ''): string =>
  Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);

const summarizeMiddle = (value: string): string => {
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}...${value.slice(-10)}`;
};

export default function ClaimSuccessScreen() {
  useScreenTracking('claim_success');
  const router = useRouter();
  const colors = useThemeColors();
  const { amount, asset, accountId, txHash } = useLocalSearchParams();

  const parsedAmount = readParam(amount, '0');
  const parsedAsset = readParam(asset, 'XLM:native');
  const parsedAccountId = readParam(accountId, 'unknown-account');
  const parsedTxHash = readParam(txHash, '');

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const explorerUrl = parsedTxHash
    ? `https://stellar.expert/explorer/public/tx/${parsedTxHash}`
    : '';

  const handleOpenExplorer = async () => {
    if (!explorerUrl) return;
    const canOpen = await Linking.canOpenURL(explorerUrl);
    if (!canOpen) { Alert.alert('Unable to open explorer link right now.'); return; }
    await Linking.openURL(explorerUrl);
  };

  const handleShare = async () => {
    const message = [
      'Claim completed on Bridgelet.',
      `Amount: ${parsedAmount} ${parsedAsset}`,
      `Account: ${parsedAccountId}`,
      parsedTxHash ? `Transaction: ${parsedTxHash}` : '',
      explorerUrl,
    ].filter(Boolean).join('\n');
    await Share.share({ message });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }], backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
          <Text style={[styles.icon, { color: colors.successText }]}>✓</Text>
        </Animated.View>

        <Text style={[styles.title, { color: colors.text }]}>Claim Successful</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Your transfer has been claimed and recorded successfully.
        </Text>

        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Transaction Summary</Text>
          {[
            { label: 'Amount', value: parsedAmount },
            { label: 'Asset', value: parsedAsset },
            { label: 'Account', value: summarizeMiddle(parsedAccountId) },
            { label: 'Tx Hash', value: summarizeMiddle(parsedTxHash || 'pending') },
          ].map(({ label, value }) => (
            <View key={label} style={styles.summaryRow}>
              <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }, !explorerUrl && styles.disabledButton]}
          onPress={handleOpenExplorer}
          disabled={!explorerUrl}
        >
          <Text style={[styles.secondaryText, { color: colors.text }]}>Open in Stellar Explorer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={handleShare}
        >
          <Text style={[styles.secondaryText, { color: colors.text }]}>Share Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/send')}
        >
          <Text style={styles.primaryText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, alignItems: 'stretch', gap: 12 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 8,
  },
  icon: { fontSize: 42, fontWeight: '700', lineHeight: 44 },
  title: { textAlign: 'center', fontSize: 28, fontWeight: '700', marginTop: 8 },
  subtitle: { textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 4 },
  summaryCard: { marginTop: 8, borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  primaryButton: { marginTop: 8, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600' },
  disabledButton: { opacity: 0.45 },
});
