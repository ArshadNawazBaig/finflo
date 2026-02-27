import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, typography, spacing, radii } from '../theme/theme';
import Logo from './Logo';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightElement?: React.ReactNode;
}

export default function AppHeader({
  title,
  showBack = false,
  showLogo = false,
  rightElement,
}: AppHeaderProps) {
  const navigation = useNavigation();

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.screen}
      />
      <View style={styles.container}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <View style={styles.backCircle}>
                <ChevronLeft color={colors.text.primary} size={20} />
              </View>
            </TouchableOpacity>
          )}
          {showLogo && <Logo size={32} showText subtitle="" />}
          {title && !showLogo && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
        {rightElement && <View style={styles.right}>{rightElement}</View>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    marginRight: 4,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.background.glass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
});
