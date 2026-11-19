import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useScreenTracking } from '../src/hooks/useScreenTracking';

type ActivityItem = {
  id: string;
  recipient: string;
  amount: string;
  asset: string;
  status: 'unclaimed' | 'claimed' | 'expired';
  createdAt: string;
};

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'tr_001',
    recipient: 'Nene Obi',
    amount: '24.50',
    asset: 'USDC',
    status: 'unclaimed',
    createdAt: '2026-04-26',
  },
  {
    id: 'tr_002',
    recipient: 'Musa Bello',
    amount: '5.00',
    asset: 'XLM',
    status: 'claimed',
    createdAt: '2026-04-25',
  },
  {
    id: 'tr_003',
    recipient: 'Ada Nwosu',
    amount: '8.10',
    asset: 'USDC',
    status: 'expired',
    createdAt: '2026-04-22',
  },
];

const statusColors: Record<ActivityItem['status'], string> = {
  unclaimed: '#F59E0B',
  claimed: '#22C55E',
  expired: '#EF4444',
};

export default function SenderDashboardScreen() {
  useScreenTracking('send_dashboard');
  const router = useRouter();
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const loadActivity = () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setActivity(MOCK_ACTIVITY);
        resolve();
      }, 900);
    });
  };

  useEffect(() => {
    loadActivity().then(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivity();
    setRefreshing(false);
  };

  const summary = useMemo(() => {
    const totalSent = activity.reduce((sum, item) => {
      const value = Number.parseFloat(item.amount);
      return Number.isNaN(value) ? sum : sum + value;
    }, 0);

    return {
      totalTransfers: activity.length,
      activeClaims: activity.filter((item) => item.status === 'unclaimed').length,
      totalSent: totalSent.toFixed(2),
    };
  }, [activity]);

  const SkeletonCard = () => (
    <View style={[styles.skeletonBlock, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={[styles.heading, { color: colors.text }]}>Sender Dashboard</Text>
        <Text style={[styles.subheading, { color: colors.subtext }]}>
          Track your transfer activity and create new claims in one place.
        </Text>

        <View style={styles.cardGrid}>
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              {[
                { label: 'Total Sent', value: summary.totalSent },
                { label: 'Transfers', value: summary.totalTransfers },
                { label: 'Active Claims', value: summary.activeClaims },
              ].map(({ label, value }) => (
                <View key={label} style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={[styles.cardLabel, { color: colors.subtext }]}>{label}</Text>
                  <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/send/create')}
        >
          <Text style={styles.primaryButtonText}>Create Transfer</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Recent Activity</Text>
        </View>

        {isLoading ? (
          <View style={styles.activityList}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : activity.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
              Create your first transfer to see activity here.
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {activity.map((item) => (
              <View key={item.id} style={[styles.activityItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View>
                  <Text style={[styles.activityRecipient, { color: colors.text }]}>{item.recipient}</Text>
                  <Text style={[styles.activityMeta, { color: colors.muted }]}>{item.createdAt}</Text>
                </View>
                <View style={styles.activityRight}>
                  <Text style={[styles.activityAmount, { color: colors.text }]}>
                    {item.amount} {item.asset}
                  </Text>
                  <Text style={[styles.activityStatus, { color: statusColors[item.status] }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  heading: { fontSize: 28, fontWeight: '700' },
  subheading: { fontSize: 14, lineHeight: 21 },
  cardGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  cardLabel: { fontSize: 13 },
  cardValue: { fontSize: 22, fontWeight: '700' },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sectionHeaderRow: { marginTop: 2 },
  sectionHeading: { fontSize: 18, fontWeight: '700' },
  activityList: { gap: 10 },
  activityItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityRecipient: { fontSize: 15, fontWeight: '600' },
  activityMeta: { marginTop: 2, fontSize: 12 },
  activityRight: { alignItems: 'flex-end', gap: 4 },
  activityAmount: { fontWeight: '700' },
  activityStatus: { textTransform: 'capitalize', fontSize: 12, fontWeight: '700' },
  emptyState: { borderRadius: 12, borderWidth: 1, padding: 18, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { marginTop: 6, textAlign: 'center', lineHeight: 20 },
  skeletonBlock: { height: 88, borderRadius: 12, borderWidth: 1, flex: 1 },
});
