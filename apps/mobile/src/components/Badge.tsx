import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme/theme';

interface BadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'secondary';
}

export default function Badge({ label, type = 'info' }: BadgeProps) {
  const getBadgeStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: colors.success + '20',
          color: colors.success,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning + '20',
          color: colors.warning,
        };
      case 'danger':
        return { backgroundColor: colors.danger + '20', color: colors.danger };
      case 'info':
        return { backgroundColor: colors.info + '20', color: colors.info };
      case 'secondary':
        return {
          backgroundColor: colors.secondary + '20',
          color: colors.secondary,
        };
      default:
        return { backgroundColor: colors.info + '20', color: colors.info };
    }
  };

  const styles = getBadgeStyle();

  return (
    <View
      style={[
        badgeStyles.container,
        { backgroundColor: styles.backgroundColor },
      ]}
    >
      <Text style={[badgeStyles.text, { color: styles.color }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
