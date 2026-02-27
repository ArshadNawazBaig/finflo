import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { loansApi } from '../../api/loans';
import { colors, typography, spacing } from '../../theme/theme';
import Badge from '../../components/Badge';
import { Landmark, Calendar, Clock } from 'lucide-react-native';
import AppHeader from '../../components/AppHeader';

export default function MemberLoanDetailScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLoanDetail = async () => {
    try {
      const response = await loansApi.getById(id);
      setLoan(response.data);
    } catch (error) {
      console.error('Error fetching loan detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLoanDetail();
  }, [id]);

  const handleRepay = () => {
    // navigation.navigate('RepayLoan', { id: loan._id })
    if (typeof Alert.alert === 'function') {
      Alert.alert(
        'Coming Soon',
        'Repayment feature will be available in the next update.',
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Loan not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Loan Details" showBack={true} />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Landmark size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>{loan.loanType || 'Personal Loan'}</Text>
          <Badge
            label={loan.status}
            type={loan.status === 'Active' ? 'success' : 'warning'}
          />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.cardLabel}>Amount Owed</Text>
          <Text style={styles.cardAmount}>
            $
            {loan.totalPayable?.toLocaleString() ||
              loan.amount.toLocaleString()}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '40%' }]} />
          </View>
          <Text style={styles.progressText}>40% Repaid</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Principal</Text>
            <Text style={styles.value}>${loan.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Interest Rate</Text>
            <Text style={styles.value}>{loan.interestRate}%</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Applied Date</Text>
            <Text style={styles.value}>
              {new Date(loan.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {loan.status === 'Active' && (
          <TouchableOpacity style={styles.repayButton} onPress={handleRepay}>
            <Text style={styles.repayButtonText}>Make a Repayment</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  amountCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.sizes.sm,
    marginBottom: 4,
  },
  cardAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  progressText: {
    color: 'white',
    fontSize: 12,
  },
  section: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.text.secondary,
    fontSize: typography.sizes.base,
  },
  value: {
    color: colors.text.primary,
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  repayButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
  },
  repayButtonText: {
    color: 'white',
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.screen,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.base,
  },
});
