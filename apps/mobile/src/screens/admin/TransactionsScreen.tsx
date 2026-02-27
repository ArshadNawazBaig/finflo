import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { transactionsApi } from '../../api/transactions';
import { colors, typography, spacing } from '../../theme/theme';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CreditCard,
} from 'lucide-react-native';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await transactionsApi.getAll();
      setTransactions(response.data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const isOutflow =
      item.type === 'outflow' ||
      item.type === 'expense' ||
      item.type === 'loan_repayment';

    return (
      <View style={styles.card}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isOutflow
                ? colors.danger + '15'
                : colors.success + '15',
            },
          ]}
        >
          {isOutflow ? (
            <ArrowUpRight size={20} color={colors.danger} />
          ) : (
            <ArrowDownLeft size={20} color={colors.success} />
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.member}>{item.member?.fullName || 'System'}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text
          style={[
            styles.amount,
            { color: isOutflow ? colors.danger : colors.success },
          ]}
        >
          {isOutflow ? '-' : '+'}${(item.amount ?? 0).toLocaleString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Fetching transactions..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Transactions</Text>
        <Filter size={20} color={colors.text.secondary} />
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
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
            message="No transactions yet"
            icon={CreditCard}
            description="All financial movements will be logged here in detail."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  header: {
    fontSize: typography.sizes['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  description: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  member: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  date: {
    fontSize: 10,
    color: colors.text.muted,
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
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
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.sizes.base,
  },
});
