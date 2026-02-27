import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { branchesApi } from '../../api/branches';
import { colors, typography, spacing } from '../../theme/theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Building, ChevronRight, MapPin, Phone } from 'lucide-react-native';

export default function BranchesScreen({ navigation }: any) {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBranches = async () => {
    try {
      const data = await branchesApi.getAll();
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBranches();
  };

  const renderBranch = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        // navigation.navigate('BranchDetail', { id: item._id });
      }}
    >
      <View style={styles.iconContainer}>
        <Building size={24} color={colors.primary} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.detailRow}>
          <MapPin size={14} color={colors.text.muted} />
          <Text style={styles.detailText}>{item.address || 'No address'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Phone size={14} color={colors.text.muted} />
          <Text style={styles.detailText}>
            {item.contactNumber || 'No contact'}
          </Text>
        </View>
      </View>

      <ChevronRight size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <LoadingSpinner message="Fetching branches..." />;
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Branches" showBack />
      <FlatList
        data={branches}
        renderItem={renderBranch}
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
            message="No branches found"
            icon={Building}
            description="Manage your organizational branches here."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  list: {
    padding: spacing.md,
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.text.secondary,
    flex: 1,
  },
});
