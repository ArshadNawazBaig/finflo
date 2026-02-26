import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboard';
import { colors, typography, spacing } from '../../theme/theme';
import {
  LogOut,
  Users,
  Landmark,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ActivityFeed from '../../components/ActivityFeed';

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
      if (data.success) {
        setStats(data.stats);
      } else {
        setError('Failed to load dashboard data.');
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
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

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading Dashboard..." />;
  }

  const currencySymbol = (user as any)?.currency || 'Rs.';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{user?.name || 'Admin'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
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
        {error ? (
          <View style={styles.errorContainer}>
            <AlertCircle
              color={colors.danger}
              size={24}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.statsGrid}>
          <StatsCard
            label="Total Members"
            value={stats?.totalMembers || 0}
            icon={Users}
            style={{ width: '48%' }}
          />
          <StatsCard
            label="Active Loans"
            value={stats?.activeLoans || 0}
            icon={Landmark}
            iconColor={colors.warning}
            style={{ width: '48%' }}
          />
          <StatsCard
            label="Total Loan Amount"
            value={`${currencySymbol}${stats?.totalLoanAmount?.toLocaleString() || 0}`}
            icon={DollarSign}
            iconColor={colors.success}
            style={{ width: '100%', marginTop: spacing.md }}
          />
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <ActivityFeed />
      </ScrollView>
    </View>
  );
}

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
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statCard: {
    backgroundColor: colors.background.card,
    width: '48%',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: typography.sizes['2xl'],
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
    minHeight: 150,
  },
  emptyText: {
    color: colors.text.muted,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
});
