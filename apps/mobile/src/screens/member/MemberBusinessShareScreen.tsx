import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { colors, typography, spacing } from '../../theme/theme';
import { Share2, TrendingUp, DollarSign } from 'lucide-react-native';
import { MemberAuthContext } from '../../context/MemberAuthContext';

export default function MemberBusinessShareScreen() {
  const { member } = useContext(MemberAuthContext);
  const currencySymbol = (member as any)?.currency || 'Rs.';
  const shares = [
    { id: '1', date: '2024-02-15', amount: 50, type: 'Credit', total: 550 },
    { id: '2', date: '2024-01-15', amount: 50, type: 'Credit', total: 500 },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Business Shares</Text>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Share2 size={20} color={colors.primary} />
          <Text style={styles.statLabel}>Total Shares</Text>
          <Text style={styles.statValue}>550</Text>
        </View>
        <View style={styles.statCard}>
          <DollarSign size={20} color={colors.success} />
          <Text style={styles.statLabel}>Total Value</Text>
          <Text style={styles.statValue}>{currencySymbol}5,500</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Share History</Text>

      {shares.map((item) => (
        <View key={item.id} style={styles.shareItem}>
          <View style={styles.shareLeft}>
            <Text style={styles.shareDate}>
              {new Date(item.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.shareType}>{item.type}</Text>
          </View>
          <View style={styles.shareRight}>
            <Text style={styles.shareAmount}>+{item.amount} Shares</Text>
            <Text style={styles.shareTotal}>Bal: {item.total}</Text>
          </View>
        </View>
      ))}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Business shares are allocated monthly based on your membership tier
          and loan repayment history.
        </Text>
      </View>
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
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  shareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareLeft: {
    gap: 2,
  },
  shareRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  shareDate: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  shareType: {
    fontSize: 12,
    color: colors.success,
  },
  shareAmount: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.primary,
  },
  shareTotal: {
    fontSize: 12,
    color: colors.text.muted,
  },
  infoBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.info + '10',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    marginBottom: spacing.xl,
  },
  infoText: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
