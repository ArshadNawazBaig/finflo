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
import { Landmark, Calendar, User, Clock } from 'lucide-react-native';
import AppHeader from '../../components/AppHeader';

export default function LoanDetailScreen({ route, navigation }: any) {
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Principal Amount</Text>
            <Text style={styles.value}>${loan.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Interest Rate</Text>
            <Text style={styles.value}>{loan.interestRate}%</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Total Interest</Text>
            <Text style={styles.value}>
              ${loan.totalInterest?.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>
              $
              {loan.totalPayable?.toLocaleString() ||
                loan.amount.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Information</Text>
          <View style={styles.memberInfo}>
            <User size={20} color={colors.text.secondary} />
            <View>
              <Text style={styles.memberName}>{loan.member?.fullName}</Text>
              <Text style={styles.memberId}>ID: {loan.member?.memberId}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <Calendar size={16} color={colors.text.muted} />
              <Text style={styles.label}>Applied Date</Text>
            </View>
            <Text style={styles.value}>
              {new Date(loan.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <Clock size={16} color={colors.text.muted} />
              <Text style={styles.label}>Duration</Text>
            </View>
            <Text style={styles.value}>{loan.duration} Months</Text>
          </View>
        </View>
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
    marginVertical: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
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
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.success,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberName: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  memberId: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
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
  backButton: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  backButtonText: {
    color: colors.info,
    fontSize: typography.sizes.base,
  },
});
