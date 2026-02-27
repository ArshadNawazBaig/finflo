import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { membersApi } from '../../api/members';
import { colors, typography, spacing } from '../../theme/theme';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { User, ChevronRight, Users } from 'lucide-react-native';
import AppHeader from '../../components/AppHeader';

export default function MembersScreen({ navigation }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMembers = async () => {
    try {
      const data = await membersApi.getAll();
      setMembers(data.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembers();
  };

  const renderMember = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate('MemberDetail', { id: item._id });
      }}
    >
      <View style={styles.avatarContainer}>
        <User size={24} color={colors.text.secondary} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.memberId}>ID: {item.memberId}</Text>
          <Badge
            label={item.status || 'Active'}
            type={item.status === 'Suspended' ? 'danger' : 'success'}
          />
        </View>
      </View>

      <ChevronRight size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message="Fetching members..." />;
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="All Members" showBack={true} />
      <View style={styles.content}>
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              message="No members found"
              icon={Users}
              description="Invite new members to your loan program to see them here."
            />
          }
        />
      </View>
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
    fontSize: typography.sizes['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  email: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberId: {
    fontSize: 12,
    color: colors.text.muted,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.screen,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.sizes.base,
  },
});
