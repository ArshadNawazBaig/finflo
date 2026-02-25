import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing } from '../../theme/theme';
import {
  TrendingUp,
  Target,
  PlusCircle,
  ArrowRight,
} from 'lucide-react-native';

export default function MemberInvestmentScreen() {
  const investments = [
    {
      name: 'Retirement Fund',
      amount: 5000,
      returns: '+8.5%',
      color: '#4ADE80',
    },
    {
      name: 'Emergency Savings',
      amount: 2000,
      returns: '+2.1%',
      color: '#60A5FA',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Investments</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Portfolio Value</Text>
        <Text style={styles.totalAmount}>$7,000.00</Text>
        <View style={styles.growthBadge}>
          <TrendingUp size={16} color={colors.success} />
          <Text style={styles.growthText}>+5.2% Overall</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Goals</Text>
        <TouchableOpacity>
          <PlusCircle size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {investments.map((inv, index) => (
        <View key={index} style={styles.goalCard}>
          <View
            style={[styles.goalIcon, { backgroundColor: inv.color + '20' }]}
          >
            <Target size={24} color={inv.color} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>{inv.name}</Text>
            <Text style={styles.goalAmount}>
              ${inv.amount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.goalMeta}>
            <Text style={[styles.goalReturns, { color: colors.success }]}>
              {inv.returns}
            </Text>
            <ArrowRight size={16} color={colors.text.muted} />
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.exploreButton}>
        <Text style={styles.exploreButtonText}>Explore Investment Plans</Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  totalCard: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: 4,
  },
  totalAmount: {
    color: colors.text.primary,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  growthText: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  goalAmount: {
    fontSize: 12,
    color: colors.text.muted,
  },
  goalMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  goalReturns: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  exploreButton: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  exploreButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
