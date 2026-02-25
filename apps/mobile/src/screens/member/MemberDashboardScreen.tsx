import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MemberAuthContext } from '../../context/MemberAuthContext';
import { dashboardApi } from '../../api/dashboard';
import { colors, typography, spacing } from '../../theme/theme';
import {
  LogOut,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Users,
  DollarSign,
} from 'lucide-react-native';
import StatsCard from '../../components/StatsCard';

export default function MemberDashboardScreen({ navigation }: any) {
  const { member, memberLogout } = useContext(MemberAuthContext);
  const currencySymbol = (member as any)?.currency || 'Rs.';
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      // Assuming member specific stats endpoint logic
      const data = await dashboardApi.getMemberStats();
      if (data.success) {
        setStats(data.data || data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch member stats', error);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.nameText}>{member?.name || 'Member'}</Text>
        </View>
        <TouchableOpacity onPress={memberLogout} style={styles.logoutButton}>
          <LogOut color={colors.danger} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>
            {currencySymbol}
            {stats?.totalBalance?.toLocaleString() || '0.00'}
          </Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <TrendingUp color={colors.text.primary} size={20} />
              <Text style={styles.actionText}>Invest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
            >
              <DollarSign color={colors.text.primary} size={20} />
              <Text style={styles.actionText}>Borrow</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>My Wealth</Text>
        <View style={styles.wealthGrid}>
          <StatsCard
            label="Total Savings"
            value={`${currencySymbol}${stats?.savings?.toLocaleString() || 0}`}
            icon={ArrowDownLeft}
            trend="+2.5% this month"
            style={{ width: '48%' }}
          />
          <StatsCard
            label="Active Loans"
            value={`${currencySymbol}${stats?.loans?.toLocaleString() || 0}`}
            icon={ArrowUpRight}
            trend="1 active"
            style={{ width: '48%' }}
          />
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.activityCard}>
          <Text style={styles.emptyText}>No recent transactions</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// End of DashboardScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'] * 1.5,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  welcomeText: {
    color: colors.text.muted,
    fontSize: typography.sizes.sm,
  },
  nameText: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    borderRadius: 16,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.sizes.base,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    color: colors.text.primary,
    fontSize: typography.sizes['4xl'],
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: spacing.md,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    gap: spacing.xs,
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  actionText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  wealthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  wealthCard: {
    backgroundColor: colors.background.card,
    width: '48%',
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wealthLabel: {
    color: colors.text.muted,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  wealthValue: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
  },
  activityCard: {
    backgroundColor: colors.background.card,
    padding: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    color: colors.text.muted,
  },
});
