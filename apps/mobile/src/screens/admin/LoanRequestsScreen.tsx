import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { loansApi } from '../../api/loans';
import { colors, typography, spacing } from '../../theme/theme';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Landmark, Check, X, User, Bell } from 'lucide-react-native';

export default function LoanRequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const response = await loansApi.getAll({ status: 'Pending' });
      // Filter manually just in case API doesn't support filter
      const pending = (response.data || []).filter(
        (l: any) => l.status === 'Pending',
      );
      setRequests(pending);
    } catch (error) {
      console.error('Error fetching loan requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await loansApi.approveReq(id);
      if (typeof Alert.alert === 'function') {
        Alert.alert('Success', 'Loan request approved');
      }
      fetchRequests();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Approval failed';
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', msg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await loansApi.rejectReq(id, { reason: 'Denied by administrator' });
      if (typeof Alert.alert === 'function') {
        Alert.alert('Success', 'Loan request rejected');
      }
      fetchRequests();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Rejection failed';
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', msg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const renderRequest = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <User size={18} color={colors.text.secondary} />
          <Text style={styles.userName}>{item.member?.fullName}</Text>
        </View>
        <Badge label="Pending" type="warning" />
      </View>

      <View style={styles.details}>
        <Text style={styles.amount}>${item.amount.toLocaleString()}</Text>
        <Text style={styles.loanType}>{item.loanType || 'General Loan'}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item._id)}
          disabled={actionLoading === item._id}
        >
          <X size={20} color={colors.danger} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item._id)}
          disabled={actionLoading === item._id}
        >
          {actionLoading === item._id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Check size={20} color="white" />
              <Text style={styles.approveText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Fetching requests..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Requests</Text>
      <FlatList
        data={requests}
        renderItem={renderRequest}
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
            message="No pending requests"
            icon={Bell}
            description="You are all caught up! New loan applications will appear here."
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
  header: {
    fontSize: typography.sizes['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  details: {
    marginBottom: spacing.lg,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  loanType: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: colors.danger + '10',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  approveButton: {
    backgroundColor: colors.primary,
  },
  rejectText: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  approveText: {
    color: 'white',
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.screen,
  },
  emptyContainer: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.sizes.base,
  },
});
