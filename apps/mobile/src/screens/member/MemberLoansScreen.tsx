import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { loansApi } from '../../api/loans';
import { colors, typography, spacing } from '../../theme/theme';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Landmark, ChevronRight, Calendar, Plus } from 'lucide-react-native';
import AppHeader from '../../components/AppHeader';

export default function MemberLoansScreen({ navigation }: any) {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyLoans = async () => {
    try {
      const response = await loansApi.getMemberLoans();
      setLoans(response.data || []);
    } catch (error) {
      console.error('Error fetching my loans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyLoans();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyLoans();
  };

  const getStatusType = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      case 'closed':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const renderLoan = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate('LoanDetail', { id: item._id });
      }}
    >
      <View style={styles.iconContainer}>
        <Landmark size={24} color={colors.primary} />
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.cardHeader}>
          <Text style={styles.amount}>
            ${(item.amount ?? 0).toLocaleString()}
          </Text>
          <Badge label={item.status} type={getStatusType(item.status)} />
        </View>
        <Text style={styles.loanType}>{item.loanType || 'Personal Loan'}</Text>
        <View style={styles.metaRow}>
          <Calendar size={14} color={colors.text.muted} />
          <Text style={styles.date}>
            Applied: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <ChevronRight size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message="Fetching your loans..." />;
  }

  return (
    <View style={styles.container}>
      <AppHeader title="My Loans" showBack={true} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>My Loans</Text>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => navigation.navigate('ApplyLoan')}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={loans}
          renderItem={renderLoan}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              message="No loans applied yet"
              icon={Landmark}
              description="Your loan applications and their status will be tracked here once you apply."
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    fontSize: typography.sizes['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amount: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  loanType: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 12,
    color: colors.text.muted,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.screen,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
