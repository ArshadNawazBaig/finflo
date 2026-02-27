import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  LogOut,
  User,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '../theme/theme';
import Logo from './Logo';
import { MemberAuthContext } from '../context/MemberAuthContext';
import { AuthContext } from '../context/AuthContext';

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
  const { member, memberLogout } = useContext(MemberAuthContext);
  const { user, logout } = useContext(AuthContext);
  const [menuVisible, setMenuVisible] = useState(false);

  const currentUser = member || user;
  const currentLogout = member ? memberLogout : logout;

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const initials = getInitials(currentUser?.name || '');

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.screen}
      />
      <View style={styles.wrapper}>
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
            {showLogo && (
              <Logo size={32} showText subtitle={member ? 'Member' : 'Admin'} />
            )}
            {title && !showLogo && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>

          <View style={styles.right}>
            {rightElement}
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => setMenuVisible(true)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuName}>{currentUser?.name}</Text>
              <Text style={styles.menuEmail}>
                {(currentUser as any)?.email || (currentUser as any)?.memberId}
              </Text>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                // @ts-ignore
                navigation.navigate('Settings');
              }}
            >
              <User size={18} color={colors.text.secondary} />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                // @ts-ignore
                navigation.navigate('Settings');
              }}
            >
              <SettingsIcon size={18} color={colors.text.secondary} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={async () => {
                setMenuVisible(false);
                await currentLogout();
              }}
            >
              <LogOut size={18} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  container: {
    height: 64,
    backgroundColor: colors.background.glass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...shadows.card,
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
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  avatarButton: {
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 120 : 80,
    paddingRight: 20,
  },
  menuContainer: {
    width: 220,
    backgroundColor: '#0f172a',
    borderRadius: radii.xl,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...shadows.glow,
  },
  menuHeader: {
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  menuName: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.text.primary,
  },
  menuEmail: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  menuItemText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  logoutItem: {
    marginTop: spacing.xs,
  },
});
