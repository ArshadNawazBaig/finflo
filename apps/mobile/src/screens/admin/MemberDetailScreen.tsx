import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { membersApi } from '../../api/members';
import { colors, typography, spacing } from '../../theme/theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import StatsCard from '../../components/StatsCard';
import {
  User,
  Mail,
  Smartphone,
  Calendar,
  Landmark,
  DollarSign,
} from 'lucide-react-native';

import { AuthContext } from '../../context/AuthContext';

export default function MemberDetailScreen({ route }: any) {
  const { user } = useContext(AuthContext);
  const currencySymbol = (user as any)?.currency || 'Rs.';
  const { id } = route.params || {};
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const data = await membersApi.getById(id);
        setMember(data.data || data);
      } catch (error) {
        console.error('Error fetching member detail:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMember();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading member profile..." />;
  }

  if (!member) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Member not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Member Profile" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User size={40} color={colors.text.secondary} />
          </View>
          <Text style={styles.name}>{member.fullName}</Text>
          <Badge
            label={member.status || 'Active'}
            type={member.status === 'Suspended' ? 'danger' : 'success'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoRow}>
            <Mail size={18} color={colors.text.muted} />
            <Text style={styles.infoText}>{member.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Smartphone size={18} color={colors.text.muted} />
            <Text style={styles.infoText}>
              {member.phone || 'No phone provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Calendar size={18} color={colors.text.muted} />
            <Text style={styles.infoText}>
              Joined: {new Date(member.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Financial Summary</Text>
        <View style={styles.statsGrid}>
          <StatsCard
            label="Total Loans"
            value={member.loanCount || 0}
            icon={Landmark}
            style={{ width: '48%' }}
          />
          <StatsCard
            label="Total Borrowed"
            value={`${currencySymbol}${member.totalBorrowed?.toLocaleString() || 0}`}
            icon={DollarSign}
            iconColor={colors.success}
            style={{ width: '48%' }}
          />
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View Loan History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
          <Text style={styles.dangerButtonText}>Suspend Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  section: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: typography.sizes.base,
  },
  dangerButton: {
    borderColor: colors.danger + '50',
  },
  dangerButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.text.muted,
  },
});
