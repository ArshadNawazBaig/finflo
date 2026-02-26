import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MemberAuthContext } from '../../context/MemberAuthContext';
import { colors, typography, spacing } from '../../theme/theme';
import {
  User,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
} from 'lucide-react-native';

export default function MemberSettingsScreen() {
  const { member, memberLogout } = useContext(MemberAuthContext);

  const settingsOptions = [
    { title: 'Personal Information', icon: User, action: () => {} },
    { title: 'Notifications', icon: Bell, action: () => {} },
    { title: 'Security', icon: Shield, action: () => {} },
    { title: 'Help & Support', icon: HelpCircle, action: () => {} },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileImage}>
          <User size={32} color={colors.text.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{member?.name}</Text>
          <Text style={styles.profileId}>ID: {member?.memberId}</Text>
        </View>
      </View>

      <View style={styles.section}>
        {settingsOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.option,
              index === settingsOptions.length - 1 && styles.lastOption,
            ]}
            onPress={option.action}
          >
            <View style={styles.optionLeft}>
              <option.icon size={20} color={colors.text.secondary} />
              <Text style={styles.optionText}>{option.title}</Text>
            </View>
            <ChevronRight size={18} color={colors.text.muted} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={memberLogout}>
        <LogOut size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Version 1.0.0</Text>
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
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  profileId: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
  section: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoutText: {
    color: colors.danger,
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    color: colors.text.muted,
    fontSize: typography.sizes.xs,
    paddingBottom: spacing.xl,
  },
});
