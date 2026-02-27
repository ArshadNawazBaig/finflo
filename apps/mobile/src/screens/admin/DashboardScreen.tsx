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
import { AuthContext } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboard';
import { colors, typography, spacing, radii, shadows } from '../../theme/theme';
import {
  LogOut,
  Users,
  Landmark,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Activity,
  ChevronRight,
} from 'lucide-react-native';
import LoadingSpinner from '../../components/LoadingSpinner';
import ActivityFeed from '../../components/ActivityFeed';
import Logo from '../../components/Logo';
import AppHeader from '../../components/AppHeader';

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await dashboardApi.getStats();
      if (data.success) setStats(data.stats);
      else setError('Failed to load dashboard data.');
    } catch {
      setError('An error occurred while loading data.');
    } finally {
      setLoading(false);
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

  if (loading && !refreshing)
    return <LoadingSpinner message="Loading Dashboard..." />;

  const currency = (user as any)?.currency || 'Rs.';

  const statCards = [
    {
      label: 'Total Members',
      value: stats?.members?.total || stats?.totalMembers || 0,
      icon: Users,
      color: colors.primary,
      bg: 'rgba(99,102,241,0.12)',
    },
    {
      label: 'Active Loans',
      value: stats?.activeLoans?.count || stats?.activeLoans || 0,
      icon: Landmark,
      color: colors.warning,
      bg: 'rgba(245,158,11,0.12)',
    },
    {
      label: 'Net Profit',
      value: `${currency}${(stats?.profit?.amount || stats?.netProfit || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: colors.success,
      bg: 'rgba(16,185,129,0.12)',
    },
    {
      label: 'Disbursed',
      value: `${currency}${(stats?.banking?.disbursed?.amount || stats?.totalLoanAmount || 0).toLocaleString()}`,
      icon: DollarSign,
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
            tintColor={colors.primary}
          />
        }
      >
        {/* Welcome */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeSmall}>Good day,</Text>
            <Text style={styles.welcomeName}>{user?.name || 'Admin'} 👋</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {(user as any)?.role || 'Admin'}
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section: Stats */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Activity size={14} color={colors.text.muted} />
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <s.icon size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={[styles.sectionRow, { marginTop: spacing.md }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <ChevronRight size={16} color={colors.text.muted} />
        </View>
        <ActivityFeed />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.screen },
  header: {
    backgroundColor: 'transparent',
  },
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
  roleBadge: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'capitalize',
    letterSpacing: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: typography.sizes.sm, flex: 1 },
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.background.glass,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.lg,
    gap: 6,
    ...shadows.card,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    fontWeight: '600',
  },
});
