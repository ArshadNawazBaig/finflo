import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, radii, shadows } from '../theme/theme';
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Using glass color manually to ensure transparency
    borderRadius: radii['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 150,
    ...shadows.glow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  trendText: {
    fontSize: typography.sizes.xs,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    gap: 6,
  },
  value: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
  },
});
