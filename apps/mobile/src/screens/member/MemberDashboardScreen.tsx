import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MemberAuthContext } from '../../context/MemberAuthContext';
import { dashboardApi } from '../../api/dashboard';
import { colors, typography, spacing, radii, shadows } from '../../theme/theme';
import {
  LogOut,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Landmark,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import Logo from '../../components/Logo';
import AppHeader from '../../components/AppHeader';

export default function MemberDashboardScreen({ navigation }: any) {
  const { member, memberLogout } = useContext(MemberAuthContext);
  const currency = (member as any)?.currency || 'Rs.';
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await dashboardApi.getMemberStats();
      if (data.success) setStats(data.data);
    } catch (e) {
      console.error('Failed to fetch member stats', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const wealthCards = [
    {
      label: 'Total Balance',
      value: `${currency}${(stats?.currentBalance || stats?.totalBalance || 0).toLocaleString()}`,
      icon: DollarSign,
      color: colors.primary,
      bg: 'rgba(99,102,241,0.12)',
    },
    {
      label: 'Total Invested',
      value: `${currency}${(stats?.totalInvested || stats?.savings || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: colors.success,
      bg: 'rgba(16,185,129,0.12)',
    },
    {
      label: 'Active Loans',
      value: `${currency}${(stats?.activeLoanAmount || stats?.loans || 0).toLocaleString()}`,
      icon: Landmark,
      color: colors.warning,
      bg: 'rgba(245,158,11,0.12)',
    },
    {
      label: 'Total Profit',
      value: `${currency}${(stats?.totalProfit || 0).toLocaleString()}`,
      icon: ArrowDownLeft,
      color: colors.accent,
      bg: 'rgba(236,72,153,0.12)',
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.screen}
      />

      <AppHeader showLogo={true} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Welcome */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeSmall}>Hello,</Text>
            <Text style={styles.welcomeName}>
              {member?.name || 'Member'} 👋
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Member</Text>
          </View>
        </View>

        {/* Hero Balance Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Portfolio Value</Text>
          <Text style={styles.heroAmount}>
            {currency}
            {(
              stats?.currentBalance ||
              stats?.totalBalance ||
              0
            ).toLocaleString()}
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => navigation.navigate('Invest')}
            >
              <ArrowDownLeft size={16} color="#fff" />
              <Text style={styles.heroBtnText}>Invest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heroBtn, styles.heroBtnSecondary]}
              onPress={() => navigation.navigate('Loans')}
            >
              <ArrowUpRight size={16} color={colors.secondary} />
              <Text style={[styles.heroBtnText, { color: colors.secondary }]}>
                Loans
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heroBtn, styles.heroBtnSecondary]}
              onPress={() => navigation.navigate('ApplyLoan')}
            >
              <Plus size={16} color={colors.secondary} />
              <Text style={[styles.heroBtnText, { color: colors.secondary }]}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wealth Grid */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>My Wealth</Text>
          <ChevronRight size={14} color={colors.text.muted} />
        </View>

        <View style={styles.grid}>
          {wealthCards.map((c) => (
            <View key={c.label} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: c.bg }]}>
                <c.icon size={16} color={c.color} />
              </View>
              <Text style={styles.cardValue}>{c.value}</Text>
              <Text style={styles.cardLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.screen },
  scroll: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  welcomeSmall: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    marginBottom: 2,
  },
  welcomeName: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 1,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radii['2xl'],
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    alignItems: 'center',
    ...shadows.glow,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroAmount: {
    color: '#fff',
    fontSize: typography.sizes['4xl'],
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: radii.full,
  },
  heroBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBtnText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    backgroundColor: colors.background.glass,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.lg,
    gap: 6,
    ...shadows.card,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  cardLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    fontWeight: '600',
  },
});
