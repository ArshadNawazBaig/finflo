import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '../theme/theme';
import { LucideIcon } from 'lucide-react-native';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: string;
  trendType?: 'success' | 'danger' | 'info';
  style?: ViewStyle;
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  iconColor = colors.primary,
  trend,
  trendType = 'success',
  style,
}: StatsCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View
          style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}
        >
          <Icon size={20} color={iconColor} />
        </View>
        {trend && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: colors[trendType] + '15' },
            ]}
          >
            <Text style={[styles.trendText, { color: colors[trendType] }]}>
              {trend}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 150,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    padding: spacing.sm,
    borderRadius: 12,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    gap: 4,
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
